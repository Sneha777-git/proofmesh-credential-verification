import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import { Alert, Button, MonoValue, Panel, PanelHeader } from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";
import { VerificationResultView } from "@/components/pm/verification";
import { CREDENTIAL_ID_PATTERN } from "@/lib/proofmesh";
import { useVerifyRecord } from "@/lib/use-verify";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicVerifyPage,
});

function PublicVerifyPage() {
  const { credentialId: raw } = useParams({ from: "/verify/$credentialId" });
  const credentialId = raw.toUpperCase();
  const valid = CREDENTIAL_ID_PATTERN.test(credentialId);
  const { outcome, credential, message, run } = useVerifyRecord();

  useEffect(() => {
    if (valid) void run(credentialId, "public_link");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId, valid]);

  return (
    <div>
      <PageHeader
        eyebrow="Public verification"
        title="Credential check"
        description="This page can be opened by anyone. No account, wallet or app install is required to inspect the record."
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
                disabled={!valid}
                onClick={() => void run(credentialId, "public_link")}
              >
                Re-check record
              </Button>
            </div>
          </Panel>
          <Alert tone="info" title="Independent check">
            Once on-chain proofs are live you can verify without this page: hash the
            document yourself with SHA-256 and compare it with the value in the contract.
          </Alert>
        </div>

        <VerificationResultView
          outcome={valid ? outcome : "error"}
          credentialId={credentialId}
          credential={credential}
          message={valid ? message : "This is not a valid credential ID. IDs look like PM-000001."}
          onRetry={() => valid && void run(credentialId, "public_link")}
        />
      </Container>
    </div>
  );
}
