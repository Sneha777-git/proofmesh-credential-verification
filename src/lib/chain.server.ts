import { getAddress, parseEventLogs, type Hex } from "viem";

import type { ChainState } from "./proofmesh";
import { credentialRegistryAbi } from "./web3/abi";
import { CONTRACT_ADDRESS, DEPLOY_BLOCK, PUBLIC_RPC_URL, formatCredentialId, isContractConfigured } from "./web3/config";
import { makePublicClient, readCredential, readIsAuthorizedIssuer, readVerify } from "./web3/contract";

export type { ChainState };

/** Server-side reads use the private SEPOLIA_RPC_URL when set; else a public RPC. */
export function chainClient() {
  return makePublicClient(process.env["SEPOLIA_RPC_URL"] || PUBLIC_RPC_URL);
}

const EMPTY: ChainState = {
  configured: false,
  available: false,
  exists: false,
  documentHash: null,
  issuer: null,
  issuerAuthorized: null,
  issuedAt: null,
  credentialType: null,
  revoked: false,
  hashMatches: null,
};

export async function readChainState(id: bigint, documentHash?: Hex): Promise<ChainState> {
  if (!isContractConfigured()) return EMPTY;
  try {
    const client = chainClient();
    const c = await readCredential(client, id);
    if (!c) return { ...EMPTY, configured: true, available: true };
    const [authorized, verify] = await Promise.all([
      readIsAuthorizedIssuer(client, c.issuer),
      documentHash ? readVerify(client, id, documentHash) : Promise.resolve(null),
    ]);
    return {
      configured: true,
      available: true,
      exists: true,
      documentHash: c.documentHash,
      issuer: c.issuer,
      issuerAuthorized: authorized,
      issuedAt: new Date(Number(c.issuedAt) * 1000).toISOString(),
      credentialType: c.credentialType,
      revoked: c.revoked,
      hashMatches: verify ? verify.hashMatches : null,
    };
  } catch (error) {
    console.error("[chain] read failed", error instanceof Error ? error.message : error);
    return { ...EMPTY, configured: true };
  }
}

/**
 * Mirror on-chain state into the database. The chain is the source of truth: the caller
 * only names a credential ID (and optionally a tx hash to locate it faster); every stored
 * value is read from the contract/receipts, so a client cannot inject status or hashes.
 */
export async function syncCredentialFromChain(id: bigint, txHint?: Hex) {
  const contractAddress = CONTRACT_ADDRESS;
  if (!isContractConfigured() || !contractAddress) return { ok: false as const, reason: "not_configured" };
  const client = chainClient();
  const c = await readCredential(client, id);
  if (!c) return { ok: false as const, reason: "not_found" };

  let transactionHash: Hex | null = null;
  let blockNumber: bigint | null = null;
  if (txHint) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHint });
      const logs = parseEventLogs({ abi: credentialRegistryAbi, logs: receipt.logs, eventName: "CredentialRegistered" });
      const match = logs.find(
        (l) => l.address.toLowerCase() === contractAddress.toLowerCase() && l.args.credentialId === id,
      );
      if (match) {
        transactionHash = receipt.transactionHash;
        blockNumber = receipt.blockNumber;
      }
    } catch {
      /* fall through to log search */
    }
  }
  if (!transactionHash) {
    try {
      const logs = await client.getContractEvents({
        address: contractAddress,
        abi: credentialRegistryAbi,
        eventName: "CredentialRegistered",
        args: { credentialId: id },
        fromBlock: DEPLOY_BLOCK,
      });
      if (logs[0]) {
        transactionHash = logs[0].transactionHash;
        blockNumber = logs[0].blockNumber;
      }
    } catch {
      /* some public RPCs cap log ranges; the record still syncs without tx data */
    }
  }

  const issuerWallet = getAddress(c.issuer).toLowerCase();
  const authorized = await readIsAuthorizedIssuer(client, c.issuer);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existingIssuer } = await supabaseAdmin
    .from("issuers")
    .select("id")
    .eq("wallet_address", issuerWallet)
    .maybeSingle();
  if (existingIssuer) {
    await supabaseAdmin
      .from("issuers")
      .update({ authorization_status: authorized ? "authorized" : "unauthorized" })
      .eq("wallet_address", issuerWallet);
  } else {
    await supabaseAdmin.from("issuers").insert({
      wallet_address: issuerWallet,
      issuer_name: `Issuer ${issuerWallet.slice(0, 6)}…${issuerWallet.slice(-4)}`,
      authorization_status: authorized ? "authorized" : "unauthorized",
    });
  }

  const row = {
    credential_id: formatCredentialId(id),
    issuer_wallet: issuerWallet,
    credential_type: c.credentialType as "Academic",
    document_hash: c.documentHash.toLowerCase(),
    status: c.revoked ? ("REVOKED" as const) : ("ACTIVE" as const),
    issued_at: new Date(Number(c.issuedAt) * 1000).toISOString(),
    ...(transactionHash ? { transaction_hash: transactionHash.toLowerCase(), block_number: Number(blockNumber) } : {}),
  };
  const { error } = await supabaseAdmin.from("credentials").upsert(row, { onConflict: "credential_id" });
  if (error) {
    console.error("[sync] upsert failed", error.code, error.message);
    return { ok: false as const, reason: "db_error" };
  }
  return { ok: true as const };
}
