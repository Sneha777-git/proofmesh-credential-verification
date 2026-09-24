import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Alert,
  Button,
  EmptyState,
  Panel,
  PanelHeader,
} from "@/components/pm/primitives";
import { Container, PageHeader, WalletButton } from "@/components/pm/site";
import type { Credential } from "@/lib/proofmesh";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Issuer dashboard — ProofMesh" },
      {
        name: "description",
        content:
          "Manage issued credentials, check their on-chain status and revoke when needed.",
      },
      { property: "og:title", content: "Issuer dashboard — ProofMesh" },
      {
        property: "og:description",
        content: "Credential registry overview for authorized issuers.",
      },
    ],
  }),
  component: DashboardPage,
});

const STATS = [
  { label: "Credentials issued", hint: "Registered proofs" },
  { label: "Active", hint: "Not revoked" },
  { label: "Revoked", hint: "Marked invalid" },
  { label: "Verifications", hint: "Public checks" },
];

/** No backend in Phase 1: the registry is intentionally empty. */
const credentials: Credential[] = [];

function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Issuer workspace"
        title="Dashboard"
        description="Everything you have registered, with its proof trail and current status."
        actions={
          <>
            <WalletButton />
            <Link to="/issue">
              <Button size="sm">Issue credential</Button>
            </Link>
          </>
        }
      />

      <Container className="space-y-8 py-10 lg:py-14">
        <Alert tone="warning" title="No data source connected">
          The credential registry is not connected yet, so there are no statistics to show.
          Counters stay blank rather than displaying invented numbers.
        </Alert>

        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-panel/70 p-5">
              <p className="label-mono">{stat.label}</p>
              <p className="mt-4 font-mono text-3xl text-muted-foreground" aria-label="No data available">
                —
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
            </div>
          ))}
        </div>

        <Panel>
          <PanelHeader
            title="Issued credentials"
            description="Status, issuance date, transaction and per-credential actions."
          />
          {credentials.length === 0 ? (
            <EmptyState
              title="No credentials yet"
              description="Once an issuer wallet is connected and a credential is registered, it appears here with its hash, transaction and status."
              action={
                <Link to="/issue">
                  <Button size="sm" variant="primary">
                    Issue your first credential
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left">
                <caption className="sr-only">Issued credentials</caption>
                <thead>
                  <tr className="border-b border-border">
                    {["Credential", "Type", "Status", "Issued", "Transaction", "Actions"].map(
                      (heading) => (
                        <th key={heading} scope="col" className="label-mono px-4 py-3">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((credential) => (
                    <tr key={credential.credentialId} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-[0.78rem]">
                        {credential.credentialId}
                      </td>
                      <td className="px-4 py-3 text-sm">{credential.credentialType}</td>
                      <td className="px-4 py-3 text-sm">{credential.status}</td>
                      <td className="px-4 py-3 text-sm">{credential.issuedAt}</td>
                      <td className="px-4 py-3 font-mono text-[0.78rem]">
                        {credential.transactionHash}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                          <Button size="sm" variant="ghost">
                            Verify
                          </Button>
                          <Button size="sm" variant="ghost">
                            Copy URL
                          </Button>
                          <Button size="sm" variant="danger">
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Available actions" description="What each row will offer once the registry is live." />
          <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["View", "Open the full technical detail page for the credential."],
              ["Verify", "Run a public verification exactly as a third party would."],
              ["Revoke", "Record on-chain that the credential is no longer valid."],
              ["Copy URL", "Share the public verification link with anyone."],
            ].map(([term, description]) => (
              <div key={term} className="bg-panel/70 p-5">
                <dt className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-primary">
                  {term}
                </dt>
                <dd className="mt-3 text-sm text-subtle">{description}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </Container>
    </div>
  );
}
