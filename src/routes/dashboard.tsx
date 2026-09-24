import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  Alert,
  Button,
  CopyButton,
  EmptyState,
  LoadingRows,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/pm/primitives";
import { Container, PageHeader, WalletButton } from "@/components/pm/site";
import { formatDate } from "@/components/pm/verification";
import { RevokeAction } from "@/components/pm/web3";
import { fetchRegistryOverview } from "@/lib/credentials.functions";
import { truncateMiddle } from "@/lib/proofmesh";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Issuer dashboard — ProofMesh" },
      {
        name: "description",
        content: "Manage issued credentials, check their status and revoke when needed.",
      },
      { property: "og:title", content: "Issuer dashboard — ProofMesh" },
      { property: "og:description", content: "Credential registry overview for authorized issuers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const load = useServerFn(fetchRegistryOverview);
  const query = useQuery({ queryKey: ["registry-overview"], queryFn: () => load() });
  const res = query.data;
  const overview = res?.ok ? res.data : null;
  const failed = query.isError || (res && !res.ok);
  const credentials = overview?.credentials ?? [];

  const stats = [
    { label: "Credentials", hint: "Records in the registry", value: overview ? credentials.length : null },
    { label: "Active", hint: "Anchored and valid", value: overview ? credentials.filter((c) => c.status === "ACTIVE").length : null },
    { label: "Revoked", hint: "Marked invalid", value: overview ? credentials.filter((c) => c.status === "REVOKED").length : null },
    { label: "Verifications", hint: "Recorded lookups", value: overview ? overview.verifications : null },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Issuer workspace"
        title="Dashboard"
        description="Every credential record in the registry, with its proof trail and current status."
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
        {failed ? (
          <Alert tone="warning" title="Registry unavailable">
            {res && !res.ok ? res.message : "The credential registry could not be reached."} Counters
            stay blank rather than showing invented numbers.
          </Alert>
        ) : overview && overview.issuers.authorized === 0 ? (
          <Alert tone="info" title="No authorized issuers configured">
            The registry is connected, but no issuer has been authorized yet, so no credentials
            can be created. Issuer authorization will be tied to the smart contract in the
            next phase.
          </Alert>
        ) : null}

        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-panel/70 p-5">
              <p className="label-mono">{stat.label}</p>
              <p
                className="mt-4 font-mono text-3xl text-foreground"
                aria-label={stat.value === null ? "No data available" : undefined}
              >
                {stat.value === null ? <span className="text-muted-foreground">—</span> : stat.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
            </div>
          ))}
        </div>

        <Panel>
          <PanelHeader
            title="Credential records"
            description="Status, issuance date, transaction and per-credential actions."
          />
          {query.isLoading ? (
            <LoadingRows rows={4} />
          ) : credentials.length === 0 ? (
            <EmptyState
              title="No credentials yet"
              description="Once an authorized issuer registers a credential, it appears here with its hash, transaction and status."
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
                <caption className="sr-only">Credential records</caption>
                <thead>
                  <tr className="border-b border-border">
                    {["Credential", "Type", "Status", "Created", "Transaction", "Actions"].map((heading) => (
                      <th key={heading} scope="col" className="label-mono px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((credential) => (
                    <tr key={credential.credentialId} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-[0.78rem]">{credential.credentialId}</td>
                      <td className="px-4 py-3 text-sm">{credential.credentialType}</td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={credential.status} />
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(credential.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-[0.78rem]">
                        {credential.transactionHash ? truncateMiddle(credential.transactionHash) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to="/credentials/$credentialId" params={{ credentialId: credential.credentialId }}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                          <Link to="/verify/$credentialId" params={{ credentialId: credential.credentialId }}>
                            <Button size="sm" variant="ghost">Verify</Button>
                          </Link>
                          <CopyButton value={`/verify/${credential.credentialId}`} label="verification URL" />
                          {credential.status === "ACTIVE" ? (
                            <RevokeAction credentialId={credential.credentialId} issuerWallet={credential.issuerWallet} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Container>
    </div>
  );
}
