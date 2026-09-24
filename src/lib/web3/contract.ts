import {
  createPublicClient,
  http,
  parseEventLogs,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

import { credentialRegistryAbi } from "./abi";
import { CHAIN, CONTRACT_ADDRESS, PUBLIC_RPC_URL } from "./config";

export interface OnChainCredential {
  id: bigint;
  documentHash: Hex;
  issuer: Address;
  issuedAt: bigint;
  revoked: boolean;
  credentialType: string;
}

export function makePublicClient(rpcUrl: string = PUBLIC_RPC_URL): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http(rpcUrl, { timeout: 15_000 }) }) as PublicClient;
}

function requireAddress(): Address {
  if (!CONTRACT_ADDRESS) throw new Error("contract_not_configured");
  return CONTRACT_ADDRESS;
}

/* ------------------------------ reads ------------------------------ */

export async function readIsAuthorizedIssuer(client: PublicClient, wallet: Address): Promise<boolean> {
  return client.readContract({
    address: requireAddress(),
    abi: credentialRegistryAbi,
    functionName: "isAuthorizedIssuer",
    args: [wallet],
  });
}

export async function readCredential(client: PublicClient, id: bigint): Promise<OnChainCredential | null> {
  const address = requireAddress();
  const count = await client.readContract({ address, abi: credentialRegistryAbi, functionName: "credentialCount" });
  if (id === 0n || id > count) return null;
  const c = await client.readContract({ address, abi: credentialRegistryAbi, functionName: "getCredential", args: [id] });
  return { id, ...c };
}

export async function readVerify(client: PublicClient, id: bigint, documentHash: Hex) {
  const [exists, hashMatches, revoked, issuer] = await client.readContract({
    address: requireAddress(),
    abi: credentialRegistryAbi,
    functionName: "verifyCredential",
    args: [id, documentHash],
  });
  return { exists, hashMatches, revoked, issuer };
}

/* ------------------------------ writes ----------------------------- */

export type TxPhase = "preparing" | "wallet" | "submitted" | "confirming" | "confirmed";

export interface TxOutcome {
  hash: Hex;
  blockNumber: bigint;
  credentialId?: bigint;
}

/**
 * Simulate -> wallet signature -> submit -> wait for confirmation.
 * Simulation surfaces contract reverts (unauthorized, duplicate…) before MetaMask opens.
 * Success is only reported after a mined receipt with status "success".
 */
async function runTx(
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Address,
  request: { functionName: "registerCredential"; args: readonly [Hex, string] } | { functionName: "revokeCredential"; args: readonly [bigint] },
  onPhase: (phase: TxPhase, hash?: Hex) => void,
): Promise<TxOutcome> {
  onPhase("preparing");
  const { request: prepared } = await publicClient.simulateContract({
    address: requireAddress(),
    abi: credentialRegistryAbi,
    account,
    chain: CHAIN,
    ...request,
  } as Parameters<typeof publicClient.simulateContract>[0]);
  onPhase("wallet");
  const hash = await wallet.writeContract({ ...prepared, chain: CHAIN, account } as Parameters<WalletClient["writeContract"]>[0]);
  onPhase("submitted", hash);
  onPhase("confirming", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success") throw new Error("transaction_reverted");
  const logs = parseEventLogs({ abi: credentialRegistryAbi, logs: receipt.logs, eventName: "CredentialRegistered" });
  onPhase("confirmed", hash);
  const credentialId = logs[0]?.args.credentialId;
  return credentialId === undefined
    ? { hash, blockNumber: receipt.blockNumber }
    : { hash, blockNumber: receipt.blockNumber, credentialId };
}

export function registerOnChain(
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Address,
  documentHash: Hex,
  credentialType: string,
  onPhase: (phase: TxPhase, hash?: Hex) => void,
) {
  return runTx(publicClient, wallet, account, { functionName: "registerCredential", args: [documentHash, credentialType] }, onPhase);
}

export function revokeOnChain(
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Address,
  id: bigint,
  onPhase: (phase: TxPhase, hash?: Hex) => void,
) {
  return runTx(publicClient, wallet, account, { functionName: "revokeCredential", args: [id] }, onPhase);
}
