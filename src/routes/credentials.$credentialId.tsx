import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, QrCode } from "lucide-react";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  DataRow,
  EmptyState,
  LoadingRows,
  MonoValue,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";
import { CredentialFields, formatDate } from "@/components/pm/verification";
import { RevokeAction } from "@/components/pm/web3";
import { fetchCredential } from "@/lib/credentials.functions";
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
      { property: "og:description", content: "Full record trail for a ProofMesh credential." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CredentialDetailPage,
});

function CredentialDetailPage() {
  const { credentialId: raw } = useParams({ from: "/credentials/$credentialId" });
  const credentialId = raw.toUpperCase();
  const [showQr, setShowQr] = useState(false);
  const verificationPath = `/verify/${credentialId}`;
  const load = useServerFn(fetchCredential);
  const query = useQuery({
    queryKey: ["credential", credentialId],
    queryFn: () => load({ data: { credentialId } }),
  });
  const res = query.data;
  const credential = res?.ok ? res.data : null;

  return (
    <div>
      <PageHeader
        eyebrow="Credential record"
        title={credentialId}
        description="The technical record behind a credential: what was hashed, where it is stored, and where the proof will live."
        actions={
          <>
            <Link to="/verify/$credentialId" params={{ credentialId }}>
              <Button size="sm" variant="primary">
                Verify
              </Button>
            </Link>
            {credential?.transactionHash ? (
              <a href={`${SEPOLIA.explorerBaseUrl}/tx/${credential.transactionHash}`} target="_blank" rel="noreferrer">
                <Button size="sm">
                  View transaction
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </Button>
              </a>
            ) : (
              <Button size="sm" disabled title="Available once a transaction exists">
                View transaction
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Button>
            )}
            <Button size="sm" onClick={() => setShowQr((value) => !value)}>
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              {showQr ? "Hide QR" : "View QR"}
            </Button>
          </>
        }
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:py-14">
        <div className="space-y-6">
          {query.isLoading ? (
            <Panel>
              <PanelHeader title="Loading record" />
              <LoadingRows rows={6} />
            </Panel>
          ) : query.isError || (res && !res.ok && res.code !== "not_found") ? (
            <Alert tone="warning" title="Record could not be loaded">
              {res && !res.ok ? res.message : "The credential registry is temporarily unavailable."}
            </Alert>
          ) : !credential ? (
            <Panel>
              <EmptyState
                title="No record for this ID"
                description="No credential with this ID exists in the registry. Check the ID or ask the issuer for the verification link."
              />
            </Panel>
          ) : (
            <>
              <Alert tone="info" title="Database record, not blockchain proof">
                These values come from the ProofMesh registry. On-chain proof checking is
                not connected yet; empty fields stay empty until real values exist.
              </Alert>
              <Panel>
                <PanelHeader title="Credential" aside={<StatusBadge status={credential.status} />} />
                <CredentialFields credential={credential} />
                {credential.status === "ACTIVE" ? (
                  <div className="border-t border-border p-4 sm:p-5">
                    <RevokeAction credentialId={credential.credentialId} issuerWallet={credential.issuerWallet} />
                  </div>
                ) : null}
                <dl>
                  <DataRow label="Record created">{formatDate(credential.createdAt)}</DataRow>
                  <DataRow label="Revoked at">{formatDate(credential.revokedAt)}</DataRow>
                  <DataRow label="Chain anchoring">
                    <Badge tone={credential.transactionHash ? "accent" : "warning"}>
                      {credential.transactionHash ? "Transaction recorded" : "Not anchored yet"}
                    </Badge>
                  </DataRow>
                </dl>
              </Panel>
            </>
          )}
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
                    QR generation arrives in a later phase. The code will encode only this public URL.
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                The QR code never contains personal data — only the public verification link.
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
