import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import type { Address, Hex } from "viem";

import { Alert, Button } from "@/components/pm/primitives";
import { syncFromChain } from "@/lib/credentials.functions";
import { CHAIN_LABEL, explorerTxUrl, isContractConfigured, parseCredentialId } from "@/lib/web3/config";
import { makePublicClient, readIsAuthorizedIssuer, revokeOnChain, type TxPhase } from "@/lib/web3/contract";
import { toWeb3Error } from "@/lib/web3/errors";
import { useWallet } from "@/lib/web3/wallet";

export function usePublicClient() {
  return useMemo(() => makePublicClient(), []);
}

/** Authorization is read from the contract — never from the frontend or database. */
export function useIssuerAuthorization(address: Address | null) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["issuer-authorized", address],
    enabled: Boolean(address) && isContractConfigured(),
    queryFn: () => readIsAuthorizedIssuer(client, address!),
    staleTime: 30_000,
  });
}

export function TxLink({ hash }: { hash: Hex }) {
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 break-all font-mono text-[0.72rem] text-primary underline-offset-4 hover:underline"
    >
      {hash}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}

export function ContractNotConfigured() {
  return (
    <Alert tone="warning" title="Contract not configured">
      No CredentialRegistry address is configured for {CHAIN_LABEL}. Deploy the contract with
      the Hardhat scripts and set its address before issuing or revoking.
    </Alert>
  );
}

const PHASE_LABEL: Record<TxPhase, string> = {
  preparing: "Preparing",
  wallet: "Waiting for wallet",
  submitted: "Transaction submitted",
  confirming: "Confirming",
  confirmed: "Confirmed",
};

/**
 * Real on-chain revocation. The status only changes after the contract confirms it;
 * the database is then re-synced from chain state.
 */
export function RevokeAction({ credentialId, issuerWallet }: { credentialId: string; issuerWallet: string }) {
  const wallet = useWallet();
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const sync = useServerFn(syncFromChain);
  const auth = useIssuerAuthorization(wallet.address);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isOwnerWallet = wallet.address?.toLowerCase() === issuerWallet.toLowerCase();
  const blocker = !isContractConfigured()
    ? "Contract not configured."
    : wallet.status === "unsupported"
      ? "Install MetaMask to revoke."
      : wallet.status !== "connected"
        ? "Connect the issuing wallet to revoke."
        : wallet.wrongNetwork
          ? "Wrong network — switch to Sepolia."
          : !isOwnerWallet
            ? "Only the issuing wallet can revoke."
            : auth.data === false
              ? "This wallet is no longer an authorized issuer."
              : null;

  async function revoke() {
    const id = parseCredentialId(credentialId);
    const walletClient = wallet.getWalletClient();
    if (!id || !walletClient || !wallet.address) return;
    setError(null);
    setHash(null);
    try {
      await revokeOnChain(client, walletClient, wallet.address, id, (p, h) => {
        setPhase(p);
        if (h) setHash(h);
      });
      await sync({ data: hash ? { credentialId, txHash: hash } : { credentialId } }).catch(() => undefined);
      await queryClient.invalidateQueries();
    } catch (e) {
      setPhase(null);
      setError(toWeb3Error(e).message);
    } finally {
      setConfirming(false);
    }
  }

  const busy = phase !== null && phase !== "confirmed";
  return (
    <div className="space-y-2">
      {phase === "confirmed" ? (
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-destructive">Revoked on-chain</p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="danger" onClick={() => void revoke()} loading={busy}>
            Confirm revoke in wallet
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="danger"
          disabled={Boolean(blocker)}
          title={blocker ?? "Revoke on-chain (final)"}
          onClick={() => setConfirming(true)}
        >
          Revoke
        </Button>
      )}
      {busy ? <p className="label-mono">{PHASE_LABEL[phase!]}…</p> : null}
      {hash ? <TxLink hash={hash} /> : null}
      {error ? <p className="text-xs text-warning">{error}</p> : null}
      {blocker && !confirming && phase === null ? <p className="text-[0.7rem] text-muted-foreground">{blocker}</p> : null}
    </div>
  );
}
