import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ExternalLink, QrCode } from "lucide-react";
import { useState } from "react";

import {
  Alert,
  Button,
  DataRow,
  MonoValue,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";
import { SEPOLIA } from "@/lib/proofmesh";

export const Route = createFileRoute("/credentials/$credentialId")({
  head: ({ params }) => ({
    meta: [
      { title: `Credential ${params.credentialId} — ProofMesh` },
      {
        name: "description",
        content: `Technical detail for credential ${params.credentialId}: hash, IPFS CID, transaction and status.`,
      },
      { property: "og:title", content: `Credential ${params.credentialId} — ProofMesh` },
      {
        property: "og:description",
        content: "Full proof trail for a ProofMesh credential.",
      },
    ],
  }),
  component: CredentialDetailPage,
});

const PLACEHOLDER = "—";

function CredentialDetailPage() {
  const { credentialId } = useParams({ from: "/credentials/$credentialId" });
  const [showQr, setShowQr] = useState(false);
  const verificationPath = `/verify/${credentialId}`;

  return (
    <div>
      <PageHeader
        eyebrow="Credential record"
        title={credentialId}
        description="The complete technical record behind a credential: what was hashed, where it is stored, and where the proof lives."
        actions={
          <>
            <Link to="/verify/$credentialId" params={{ credentialId }}>
              <Button size="sm" variant="primary">
                Verify
              </Button>
            </Link>
            <Button size="sm" disabled title="Available once a transaction exists">
              View transaction
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Button>
            <Button size="sm" disabled title="Available once the document is on IPFS">
              View IPFS
            </Button>
            <Button size="sm" onClick={() => setShowQr((value) => !value)}>
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              {showQr ? "Hide QR" : "View QR"}
            </Button>
          </>
        }
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:py-14">
        <div className="space-y-6">
          <Alert tone="warning" title="Record not loaded">
            The credential registry is not connected in this phase, so no stored values are
            shown. Fields below stay empty rather than displaying invented hashes,
            transactions or CIDs.
          </Alert>

          <Panel>
            <PanelHeader
              title="Credential"
              aside={<StatusBadge status="unknown" />}
            />
            <dl>
              <DataRow label="Credential ID">
                <MonoValue value={credentialId} copyLabel="credential ID" />
              </DataRow>
              <DataRow label="Type">{PLACEHOLDER}</DataRow>
              <DataRow label="Issuer">{PLACEHOLDER}</DataRow>
              <DataRow label="Issuer wallet">
                <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
              </DataRow>
              <DataRow label="Issued at">{PLACEHOLDER}</DataRow>
              <DataRow label="Status">Unknown</DataRow>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Proof trail" />
            <dl>
              <DataRow label="Document hash (SHA-256)">
                <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
              </DataRow>
              <DataRow label="IPFS CID">
                <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
              </DataRow>
              <DataRow label="Blockchain">{SEPOLIA.name}</DataRow>
              <DataRow label="Transaction hash">
                <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
              </DataRow>
              <DataRow label="Block number">
                <span className="font-mono text-[0.78rem]">{PLACEHOLDER}</span>
              </DataRow>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Share verification" />
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="label-mono">Verification URL</p>
                <div className="mt-2">
                  <MonoValue value={verificationPath} copyLabel="verification URL" />
                </div>
              </div>
              {showQr ? (
                <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border-strong bg-surface/60 p-6 text-center">
                  <QrCode className="h-10 w-10 text-subtle" aria-hidden />
                  <p className="text-sm text-subtle">
                    QR generation arrives with the registry. The code will encode only this
                    public URL.
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                The QR code never contains personal data — only the public verification
                link.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Interpretation" />
            <div className="space-y-3 p-4 text-sm text-subtle sm:p-5">
              <p>
                A registered proof shows that this fingerprint was submitted by the issuer
                wallet above at the recorded time.
              </p>
              <p>
                It does not validate the content of the document, and it does not confirm
                the identity of the recipient.
              </p>
            </div>
          </Panel>
        </div>
      </Container>
    </div>
  );
}
