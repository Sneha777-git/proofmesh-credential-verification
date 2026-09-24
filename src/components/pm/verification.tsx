import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  DataRow,
  EmptyState,
  LoadingRows,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/pm/primitives";
import { SEPOLIA, type VerificationOutcome } from "@/lib/proofmesh";

const PLACEHOLDER = "—";

/** Field layout used by every "verified" style result. Values stay empty until Phase 2. */
function CredentialFields({ credentialId }: { credentialId?: string | undefined }) {
  return (
    <dl>
      <DataRow label="Credential ID">
        <span className="font-mono text-[0.78rem]">{credentialId ?? PLACEHOLDER}</span>
      </DataRow>
      <DataRow label="Type">{PLACEHOLDER}</DataRow>
      <DataRow label="Issuer">{PLACEHOLDER}</DataRow>
      <DataRow label="Issuer wallet">
        <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
      </DataRow>
      <DataRow label="Issued date">{PLACEHOLDER}</DataRow>
      <DataRow label="Document hash (SHA-256)">
        <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
      </DataRow>
      <DataRow label="Blockchain">{SEPOLIA.name}</DataRow>
      <DataRow label="Transaction">
        <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
      </DataRow>
      <DataRow label="Block">
        <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
      </DataRow>
      <DataRow label="IPFS CID">
        <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
      </DataRow>
    </dl>
  );
}

function ResultActions({ onRetry }: { onRetry?: (() => void) | undefined }) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border px-4 py-4 sm:px-5">
      <Button variant="primary" size="sm" onClick={onRetry}>
        Verify again
      </Button>
      <Button size="sm" disabled title="Available once a proof is registered on-chain">
        View transaction
        <ExternalLink className="h-3 w-3" aria-hidden />
      </Button>
      <Button size="sm" disabled title="Available once the document is stored on IPFS">
        View IPFS
      </Button>
      <Button size="sm" disabled title="Available once a credential is returned">
        Copy ID
      </Button>
      <Button size="sm" disabled title="Available once a credential is returned">
        Download report
      </Button>
    </div>
  );
}

export function VerificationResultView({
  outcome,
  credentialId,
  onRetry,
}: {
  outcome: VerificationOutcome;
  credentialId?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  if (outcome === "idle") {
    return (
      <Panel>
        <EmptyState
          title="No verification run yet"
          description="Enter a credential ID, scan a QR code, or upload the original PDF. Results appear here with the full on-chain proof trail."
        />
      </Panel>
    );
  }

  if (outcome === "loading") {
    return (
      <Panel>
        <PanelHeader title="Checking proof" description="Resolving the registered proof." />
        <LoadingRows rows={5} />
      </Panel>
    );
  }

  if (outcome === "verified") {
    return (
      <Panel>
        <PanelHeader
          title="Verified"
          description="A matching proof was found for this credential."
          aside={<StatusBadge status="registered" />}
        />
        <div className="px-4 pt-4 sm:px-5">
          <Alert tone="accent" title="What this proves">
            The credential's cryptographic proof is registered on {SEPOLIA.name}. It does
            not automatically certify every real-world claim inside the document.
          </Alert>
        </div>
        <div className="mt-4">
          <CredentialFields credentialId={credentialId} />
        </div>
        <ResultActions onRetry={onRetry} />
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
          <DataRow label="Registered hash">
            <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
          </DataRow>
          <DataRow label="Uploaded hash">
            <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
          </DataRow>
        </dl>
        <ResultActions onRetry={onRetry} />
      </Panel>
    );
  }

  if (outcome === "revoked") {
    return (
      <Panel>
        <PanelHeader
          title="Credential revoked"
          description="This credential was registered on-chain and later revoked by its issuer."
          aside={<StatusBadge status="revoked" />}
        />
        <div className="px-4 py-4 sm:px-5">
          <Alert tone="danger" title="Registered, then revoked">
            The original proof still exists on-chain and remains publicly auditable. The
            issuer has since marked the credential as no longer valid.
          </Alert>
        </div>
        <CredentialFields credentialId={credentialId} />
        <ResultActions onRetry={onRetry} />
      </Panel>
    );
  }

  if (outcome === "not_found") {
    return (
      <Panel>
        <PanelHeader title="No proof found" aside={<Badge>Not found</Badge>} />
        <EmptyState
          title="Nothing registered for this reference"
          description="No credential proof matches what you submitted. Check the credential ID, or ask the issuer for the verification link."
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
        <Alert tone="warning" title="Verification service not connected">
          This is the Phase 1 frontend. The database, IPFS gateway and Sepolia contract are
          not wired up yet, so no real verification can be performed. Nothing here is a
          verdict about any credential.
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
  { outcome: "verified", label: "Verified" },
  { outcome: "hash_mismatch", label: "Hash mismatch" },
  { outcome: "revoked", label: "Revoked" },
  { outcome: "not_found", label: "Not found" },
  { outcome: "loading", label: "Loading" },
  { outcome: "error", label: "Error" },
];
