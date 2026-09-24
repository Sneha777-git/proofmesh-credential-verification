import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  CopyButton,
  DataRow,
  EmptyState,
  LoadingRows,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/pm/primitives";
import { SEPOLIA, type ChainState, type Credential, type VerificationOutcome } from "@/lib/proofmesh";

const PLACEHOLDER = "—";

function Mono({ value }: { value: string | number | null | undefined }) {
  return (
    <span className="break-all font-mono text-[0.78rem]">
      {value === null || value === undefined || value === "" ? PLACEHOLDER : String(value)}
    </span>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return PLACEHOLDER;
  return new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/** Field layout for every record-style result. Missing values render as "—", never invented. */
export function CredentialFields({
  credentialId,
  credential,
}: {
  credentialId?: string | undefined;
  credential?: Credential | null | undefined;
}) {
  return (
    <dl>
      <DataRow label="Credential ID">
        <Mono value={credential?.credentialId ?? credentialId} />
      </DataRow>
      <DataRow label="Type">{credential?.credentialType ?? PLACEHOLDER}</DataRow>
      <DataRow label="Issuer">
        {credential?.issuer ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {credential.issuer.issuerName}
            <Badge tone={credential.issuer.authorizationStatus === "authorized" ? "accent" : "warning"}>
              {credential.issuer.authorizationStatus}
            </Badge>
          </span>
        ) : (
          PLACEHOLDER
        )}
      </DataRow>
      <DataRow label="Issuer wallet">
        <Mono value={credential?.issuerWallet} />
      </DataRow>
      <DataRow label="Issued date">{formatDate(credential?.issuedAt)}</DataRow>
      <DataRow label="Document hash (SHA-256)">
        <Mono value={credential?.documentHash} />
      </DataRow>
      <DataRow label="Blockchain">{SEPOLIA.name}</DataRow>
      <DataRow label="Transaction">
        <Mono value={credential?.transactionHash} />
      </DataRow>
      <DataRow label="Block">
        <Mono value={credential?.blockNumber} />
      </DataRow>
      <DataRow label="IPFS CID">
        <Mono value={credential?.ipfsCid} />
      </DataRow>
    </dl>
  );
}

function ResultActions({
  onRetry,
  credential,
}: {
  onRetry?: (() => void) | undefined;
  credential?: Credential | null | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border px-4 py-4 sm:px-5">
      <Button variant="primary" size="sm" onClick={onRetry}>
        Verify again
      </Button>
      {credential?.transactionHash ? (
        <a
          href={`${SEPOLIA.explorerBaseUrl}/tx/${credential.transactionHash}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button size="sm">
            View transaction
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Button>
        </a>
      ) : (
        <Button size="sm" disabled title="Available once a proof is registered on-chain">
          View transaction
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Button>
      )}
      <Button size="sm" disabled title="Available once the document is stored on IPFS">
        View IPFS
      </Button>
      {credential ? (
        <>
          <CopyButton value={credential.credentialId} label="credential ID" />
          <Link to="/credentials/$credentialId" params={{ credentialId: credential.credentialId }}>
            <Button size="sm" variant="ghost">
              Full record
            </Button>
          </Link>
        </>
      ) : null}
      <Button size="sm" disabled title="Available in a later phase">
        Download report
      </Button>
    </div>
  );
}

const RECORD_ONLY_NOTE =
  "This is a database record lookup only — on-chain state could not be read, so this is not a blockchain verification.";

/** Values read directly from the Sepolia contract. */
function ChainFields({ chain }: { chain: ChainState }) {
  return (
    <dl>
      <DataRow label="Source">
        <Badge tone="accent">Read from {SEPOLIA.name} testnet contract</Badge>
      </DataRow>
      <DataRow label="On-chain issuer">
        <span className="inline-flex flex-wrap items-center gap-2">
          <Mono value={chain.issuer} />
          {chain.issuerAuthorized !== null ? (
            <Badge tone={chain.issuerAuthorized ? "accent" : "warning"}>
              {chain.issuerAuthorized ? "Currently authorized" : "No longer authorized"}
            </Badge>
          ) : null}
        </span>
      </DataRow>
      <DataRow label="On-chain document hash">
        <Mono value={chain.documentHash} />
      </DataRow>
      <DataRow label="On-chain type">{chain.credentialType ?? PLACEHOLDER}</DataRow>
      <DataRow label="Block timestamp">{formatDate(chain.issuedAt)}</DataRow>
      <DataRow label="Revoked">{chain.revoked ? "Yes" : "No"}</DataRow>
    </dl>
  );
}

export function VerificationResultView({
  outcome,
  credentialId,
  credential,
  chain,
  uploadedHash,
  message,
  onRetry,
}: {
  outcome: VerificationOutcome;
  credentialId?: string | undefined;
  credential?: Credential | null | undefined;
  chain?: ChainState | null | undefined;
  uploadedHash?: string | null | undefined;
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  const liveChain = chain && chain.available && chain.exists ? chain : null;

  if (outcome === "idle") {
    return (
      <Panel>
        <EmptyState
          title="No verification run yet"
          description="Enter a credential ID, or add the original PDF to compare its fingerprint. Results appear here with the on-chain proof trail."
        />
      </Panel>
    );
  }

  if (outcome === "loading") {
    return (
      <Panel>
        <PanelHeader title="Reading Sepolia contract" description="Looking up the on-chain proof and the registry record." />
        <LoadingRows rows={5} />
      </Panel>
    );
  }

  if (outcome === "record_found" || outcome === "pending_record") {
    const pending = outcome === "pending_record";
    return (
      <Panel>
        <PanelHeader
          title={pending ? "Record found — not yet anchored" : "Database record found"}
          description={
            pending
              ? "The issuer created this record, but it has not been registered on-chain yet."
              : "A credential record with this ID exists in the ProofMesh index."
          }
          aside={credential ? <StatusBadge status={credential.status} /> : null}
        />
        <div className="px-4 pt-4 sm:px-5">
          <Alert tone="warning" title="Database record, not blockchain proof">
            {message ?? RECORD_ONLY_NOTE} A record also does not certify the claims inside the document.
          </Alert>
        </div>
        <div className="mt-4">
          <CredentialFields credentialId={credentialId} credential={credential} />
        </div>
        <ResultActions onRetry={onRetry} credential={credential} />
      </Panel>
    );
  }

  if (outcome === "verified") {
    const documentMatched = Boolean(uploadedHash) && liveChain?.hashMatches === true;
    return (
      <Panel>
        <PanelHeader
          title={documentMatched ? "Verified — document matches" : "Registered on-chain"}
          description={
            documentMatched
              ? "The uploaded file's SHA-256 fingerprint equals the one registered on Sepolia."
              : "This credential ID is registered and not revoked. Add the original PDF to compare the document itself."
          }
          aside={<StatusBadge status="ACTIVE" />}
        />
        <div className="px-4 pt-4 sm:px-5">
          <Alert tone="accent" title="What this proves">
            The fingerprint was registered by the issuer wallet shown below under the
            ProofMesh contract rules on {SEPOLIA.name} (a testnet). It does not certify the
            real-world claims inside the document or the recipient's identity.
          </Alert>
        </div>
        <div className="mt-4">
          {liveChain ? <ChainFields chain={liveChain} /> : null}
          {documentMatched ? (
            <dl>
              <DataRow label="Uploaded hash">
                <Mono value={uploadedHash} />
              </DataRow>
            </dl>
          ) : null}
          <CredentialFields credentialId={credentialId} credential={credential} />
        </div>
        <ResultActions onRetry={onRetry} credential={credential} />
      </Panel>
    );
  }

  if (outcome === "hash_mismatch") {
    return (
      <Panel>
        <PanelHeader
          title="Document integrity failed"
          description="The uploaded document does not produce the hash registered for this credential."
          aside={<Badge tone="danger">Mismatch</Badge>}
        />
        <div className="px-4 py-4 sm:px-5">
          <Alert tone="warning" title="Read carefully">
            A mismatch means this file is not byte-identical to the registered document.
            That can happen through re-saving, re-printing, editing or compression — it is
            not by itself proof of fraud. Compare with the issuer before drawing
            conclusions.
          </Alert>
        </div>
        <dl>
          <DataRow label="Registered hash (on-chain)">
            <Mono value={liveChain?.documentHash ?? credential?.documentHash} />
          </DataRow>
          <DataRow label="Uploaded hash">
            <Mono value={uploadedHash} />
          </DataRow>
        </dl>
        <ResultActions onRetry={onRetry} credential={credential} />
      </Panel>
    );
  }

  if (outcome === "revoked") {
    return (
      <Panel>
        <PanelHeader
          title="Credential revoked"
          description="The issuer has marked this credential as no longer valid."
          aside={<StatusBadge status="REVOKED" />}
        />
        <div className="px-4 py-4 sm:px-5">
          <Alert tone="danger" title="Registered, then revoked">
            Revocation does not delete history: the original record remains auditable.
            {credential?.revokedAt ? ` Revoked ${formatDate(credential.revokedAt)}.` : ""}
          </Alert>
        </div>
        <CredentialFields credentialId={credentialId} credential={credential} />
        <ResultActions onRetry={onRetry} credential={credential} />
      </Panel>
    );
  }

  if (outcome === "not_found") {
    return (
      <Panel>
        <PanelHeader title="No record found" aside={<Badge>Not found</Badge>} />
        <EmptyState
          title="Nothing registered for this reference"
          description="No credential record matches what you submitted. Check the credential ID, or ask the issuer for the verification link."
          action={
            <Button size="sm" onClick={onRetry}>
              Try another reference
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader title="Verification unavailable" aside={<Badge tone="warning">Error</Badge>} />
      <div className="px-4 py-4 sm:px-5">
        <Alert tone="warning" title="Could not complete the check">
          {message ??
            "This check could not be completed. Nothing here is a verdict about any credential."}
        </Alert>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
        <Link to="/about">
          <Button size="sm" variant="ghost">
            How verification works
          </Button>
        </Link>
      </div>
    </Panel>
  );
}

export const OUTCOME_PREVIEWS: { outcome: VerificationOutcome; label: string }[] = [
  { outcome: "record_found", label: "Record found" },
  { outcome: "verified", label: "Verified (on-chain)" },
  { outcome: "hash_mismatch", label: "Hash mismatch" },
  { outcome: "revoked", label: "Revoked" },
  { outcome: "not_found", label: "Not found" },
  { outcome: "loading", label: "Loading" },
  { outcome: "error", label: "Error" },
];
