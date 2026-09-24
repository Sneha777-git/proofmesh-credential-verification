import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, Button, MonoValue, Panel, PanelHeader } from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";
import { VerificationResultView } from "@/components/pm/verification";
import { type VerificationOutcome } from "@/lib/proofmesh";

export const Route = createFileRoute("/verify/$credentialId")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.credentialId} — ProofMesh` },
      {
        name: "description",
        content: `Public verification page for credential ${params.credentialId} on ProofMesh.`,
      },
      { property: "og:title", content: `Verify ${params.credentialId} — ProofMesh` },
      {
        property: "og:description",
        content: "Independent, account-free credential verification.",
      },
    ],
  }),
  component: PublicVerifyPage,
});

function PublicVerifyPage() {
  const { credentialId } = useParams({ from: "/verify/$credentialId" });
  const [outcome, setOutcome] = useState<VerificationOutcome>("error");

  return (
    <div>
      <PageHeader
        eyebrow="Public verification"
        title="Credential check"
        description="This page can be opened by anyone. No account, wallet or app install is required to inspect the proof."
        actions={
          <Link to="/verify">
            <Button size="sm">Verify something else</Button>
          </Link>
        }
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:py-14">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Requested credential" />
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="label-mono">Credential ID</p>
                <div className="mt-2">
                  <MonoValue value={credentialId} copyLabel="credential ID" />
                </div>
              </div>
              <div>
                <p className="label-mono">Verification URL</p>
                <p className="mt-2 break-all font-mono text-[0.72rem] text-subtle">
                  /verify/{credentialId}
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setOutcome("loading");
                  window.setTimeout(() => setOutcome("error"), 700);
                }}
              >
                Re-check proof
              </Button>
            </div>
          </Panel>
          <Alert tone="info" title="Independent check">
            You can also verify without this page: hash the document yourself with SHA-256
            and compare it with the value registered in the contract.
          </Alert>
        </div>

        <VerificationResultView
          outcome={outcome}
          credentialId={credentialId}
          onRetry={() => setOutcome("error")}
        />
      </Container>
    </div>
  );
}
