import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hex } from "viem";

import {
  Alert,
  Badge,
  Button,
  DataRow,
  FileUpload,
  MonoValue,
  Panel,
  PanelHeader,
  ProgressSteps,
  SelectField,
  type StepState,
} from "@/components/pm/primitives";
import { Container, PageHeader, WalletButton } from "@/components/pm/site";
import { ContractNotConfigured, TxLink, useIssuerAuthorization, usePublicClient } from "@/components/pm/web3";
import { syncFromChain } from "@/lib/credentials.functions";
import { CREDENTIAL_TYPES, TX_STEPS } from "@/lib/proofmesh";
import { CHAIN_LABEL, formatCredentialId, isContractConfigured, sha256File } from "@/lib/web3/config";
import { registerOnChain, type TxPhase } from "@/lib/web3/contract";
import { toWeb3Error } from "@/lib/web3/errors";
import { useWallet } from "@/lib/web3/wallet";

export const Route = createFileRoute("/issue")({
  head: () => ({
    meta: [
      { title: "Issue a credential — ProofMesh" },
      {
        name: "description",
        content: "Authorized issuers register a credential fingerprint on Ethereum Sepolia Testnet with their own wallet.",
      },
      { property: "og:title", content: "Issue a credential — ProofMesh" },
      { property: "og:description", content: "Hash a document locally and anchor its fingerprint on-chain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IssuePage,
});

type Terminal = "rejected" | "failed" | null;

const PHASE_STEP: Record<TxPhase, (typeof TX_STEPS)[number]> = {
  preparing: "PREPARING",
  wallet: "WAITING FOR WALLET",
  submitted: "TRANSACTION SUBMITTED",
  confirming: "CONFIRMING",
  confirmed: "CONFIRMED",
};

function IssuePage() {
  const wallet = useWallet();
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const sync = useServerFn(syncFromChain);
  const auth = useIssuerAuthorization(wallet.address);

  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [type, setType] = useState<string>(CREDENTIAL_TYPES[0]!);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [terminal, setTerminal] = useState<Terminal>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [result, setResult] = useState<{ credentialId: string; block: bigint } | null>(null);
  const [synced, setSynced] = useState<boolean | null>(null);

  useEffect(() => {
    setHash(null);
    if (file) void sha256File(file).then(setHash);
  }, [file]);

  const configured = isContractConfigured();
  const blocker = !configured
    ? "Contract not configured."
    : wallet.status === "unsupported"
      ? "No browser wallet detected."
      : wallet.status !== "connected"
        ? "Connect your issuer wallet."
        : wallet.wrongNetwork
          ? "Wrong network — switch to Sepolia."
          : auth.isLoading
            ? "Checking issuer authorization…"
            : auth.isError
              ? "Could not read issuer authorization from the contract."
              : auth.data === false
                ? "This wallet is not an authorized issuer."
                : !hash
                  ? "Add the credential PDF."
                  : null;

  const busy = phase !== null && phase !== "confirmed" && terminal === null;

  async function submit() {
    const walletClient = wallet.getWalletClient();
    if (blocker || !walletClient || !wallet.address || !hash) return;
    setError(null);
    setTerminal(null);
    setTxHash(null);
    setResult(null);
    setSynced(null);
    let submittedHash: Hex | undefined;
    try {
      const out = await registerOnChain(client, walletClient, wallet.address, hash, type, (p, h) => {
        setPhase(p);
        if (h) {
          submittedHash = h;
          setTxHash(h);
        }
      });
      if (out.credentialId === undefined) throw new Error("missing_event");
      const credentialId = formatCredentialId(out.credentialId);
      setResult({ credentialId, block: out.blockNumber });
      const res = await sync({ data: { credentialId, txHash: out.hash } }).catch(() => null);
      setSynced(Boolean(res && res.ok));
      await queryClient.invalidateQueries();
    } catch (e) {
      const mapped = toWeb3Error(e);
      setTerminal(mapped.code === "rejected" ? "rejected" : "failed");
      setError(submittedHash ? `${mapped.message} The transaction was submitted but did not confirm successfully.` : mapped.message);
    }
  }

  function reset() {
    setFile(null);
    setPhase(null);
    setTerminal(null);
    setError(null);
    setTxHash(null);
    setResult(null);
    setSynced(null);
  }

  const states: Record<string, StepState> = {};
  for (const step of TX_STEPS) states[step] = "idle";
  if (hash) states["FILE HASHED"] = "done";
  if (phase) {
    const order = TX_STEPS.indexOf(PHASE_STEP[phase]);
    TX_STEPS.forEach((step, i) => {
      if (i === 0) return;
      if (i < order) states[step] = "done";
      else if (i === order) states[step] = terminal ? "failed" : phase === "confirmed" ? "done" : "active";
    });
  }
  if (synced === true) states["DATABASE SYNCED"] = "done";
  if (synced === false) states["DATABASE SYNCED"] = "failed";

  const badge = terminal === "rejected" ? "Rejected" : terminal === "failed" ? "Failed" : result ? "Confirmed" : busy ? "In progress" : "Idle";

  return (
    <div>
      <PageHeader
        eyebrow="Issuance"
        title="Issue a credential"
        description="The document is fingerprinted in your browser with SHA-256. Only that fingerprint and the credential type are registered on-chain — never the document or personal data."
        actions={<WalletButton />}
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="space-y-6">
          {!configured ? (
            <ContractNotConfigured />
          ) : wallet.wrongNetwork ? (
            <Alert tone="danger" title="Wrong network">
              Your wallet is on chain {wallet.chainId}. ProofMesh only submits to {CHAIN_LABEL}.
              <div className="mt-3">
                <Button size="sm" onClick={() => void wallet.switchToSepolia()}>
                  Switch to Sepolia
                </Button>
              </div>
            </Alert>
          ) : wallet.status !== "connected" ? (
            <Alert tone="warning" title="Wallet not connected">
              Connect the issuer wallet. You'll approve the transaction inside your wallet —
              ProofMesh never handles keys or seed phrases.
            </Alert>
          ) : auth.data === false ? (
            <Alert tone="warning" title="Unauthorized issuer">
              {wallet.address} is not authorized in the ProofMesh contract. The contract owner
              must authorize it first; the contract itself rejects registrations otherwise.
            </Alert>
          ) : auth.data === true ? (
            <Alert tone="accent" title="Authorized issuer">
              The contract confirms this wallet may register credentials on {CHAIN_LABEL}.
            </Alert>
          ) : null}

          <Panel>
            <PanelHeader
              title="Credential details"
              description="Nothing personal is required. Never enter identity numbers or biometrics."
            />
            <div className="space-y-6 p-4 sm:p-5">
              <FileUpload
                label="Credential PDF"
                file={file}
                onFileChange={setFile}
                hint="Hashed locally with SHA-256. The file is not uploaded in this phase — keep the exact file you register."
              />
              {hash ? (
                <div>
                  <p className="label-mono">Document fingerprint (bytes32)</p>
                  <div className="mt-2">
                    <MonoValue value={hash} copyLabel="document hash" />
                  </div>
                </div>
              ) : null}
              <SelectField
                label="Credential type"
                options={CREDENTIAL_TYPES}
                value={type}
                onChange={(event) => setType(event.target.value)}
              />

              <div className="flex items-start gap-3 rounded-sm border border-border bg-surface/60 p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <p className="text-sm text-subtle">
                  Never submit Aadhaar, PAN, passport numbers, biometrics, passwords, seed
                  phrases or private keys. ProofMesh does not need them and will never ask
                  for them.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" disabled={Boolean(blocker) || busy} loading={busy} onClick={() => void submit()}>
                  Register on Sepolia
                </Button>
                <Button variant="ghost" onClick={reset} disabled={busy}>
                  Reset form
                </Button>
                {blocker ? <span className="text-xs text-muted-foreground">{blocker}</span> : null}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Transaction progress"
              description="Success is shown only after the transaction is mined and confirmed."
              aside={<Badge tone={terminal ? "warning" : result ? "accent" : "neutral"}>{badge}</Badge>}
            />
            <ProgressSteps steps={TX_STEPS} states={states} />
            {txHash || error || result ? (
              <div className="space-y-4 p-4 sm:p-5">
                {txHash ? (
                  <div>
                    <p className="label-mono">Transaction (Sepolia Etherscan)</p>
                    <div className="mt-2">
                      <TxLink hash={txHash} />
                    </div>
                  </div>
                ) : null}
                {error ? (
                  <Alert tone="warning" title={terminal === "rejected" ? "Rejected" : "Failed"}>
                    {error}
                  </Alert>
                ) : null}
                {result ? (
                  <>
                    <Alert tone="accent" title="Confirmed on Sepolia testnet">
                      This proves the fingerprint was registered by your wallet under the
                      contract rules. It does not certify the document's claims.
                    </Alert>
                    <dl>
                      <DataRow label="Credential ID">
                        <MonoValue value={result.credentialId} copyLabel="credential ID" />
                      </DataRow>
                      <DataRow label="Block">
                        <span className="font-mono text-[0.78rem]">{result.block.toString()}</span>
                      </DataRow>
                      <DataRow label="Database index">
                        {synced === null ? "Syncing…" : synced ? "Synced" : "Not synced yet — it will sync on the next verification."}
                      </DataRow>
                    </dl>
                    <Link to="/credentials/$credentialId" params={{ credentialId: result.credentialId }}>
                      <Button size="sm">Open credential record</Button>
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="What issuers should know" />
            <div className="space-y-3 p-4 text-sm text-subtle sm:p-5">
              <p>Registration is public: the fingerprint, your wallet and the block time are visible to anyone.</p>
              <p>You pay gas in Sepolia test ETH. This is a testnet — not mainnet, and not production finality.</p>
              <p>Revocation does not delete history. It records that the credential is no longer valid.</p>
              <p>A re-saved or re-exported PDF produces a different hash and will not match.</p>
              <Link to="/about">
                <Button size="sm" variant="ghost">
                  Read the model and its limits
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      </Container>
    </div>
  );
}
