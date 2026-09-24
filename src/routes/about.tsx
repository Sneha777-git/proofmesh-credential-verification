import { createFileRoute, Link } from "@tanstack/react-router";

import { Alert, Button, Panel, PanelHeader, SectionLabel } from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How ProofMesh works — ProofMesh" },
      {
        name: "description",
        content:
          "SHA-256 fingerprinting, blockchain anchoring, IPFS storage, and the honest limits of credential proofs.",
      },
      { property: "og:title", content: "How ProofMesh works — ProofMesh" },
      {
        property: "og:description",
        content: "The verification model behind ProofMesh, and what it cannot prove.",
      },
    ],
  }),
  component: AboutPage,
});

const LAYERS = [
  {
    name: "Credential verification",
    body: "Verification means comparing a document you hold against a fingerprint that was registered publicly before you received it. If both match, the document has not changed since registration.",
  },
  {
    name: "SHA-256 hashing",
    body: "A hash is a fixed-length fingerprint of a file. Changing a single byte changes the hash completely, and the hash cannot be reversed back into the document — so the fingerprint can be public while the file stays private.",
  },
  {
    name: "Blockchain anchoring",
    body: "The fingerprint is written to a smart contract on Ethereum Sepolia. This creates a timestamped, publicly auditable record that neither ProofMesh nor the issuer can silently rewrite.",
  },
  {
    name: "IPFS",
    body: "Documents can be stored content-addressed on IPFS, so the storage address is itself derived from the content. Issuers decide what is appropriate to store.",
  },
  {
    name: "Supabase",
    body: "Application data — issuer accounts, credential metadata, verification history — lives in a managed Postgres database with row-level access rules.",
  },
  {
    name: "n8n",
    body: "Automation handles the repetitive parts of issuance and revocation: validation, hashing, storage and notifications.",
  },
  {
    name: "MetaMask",
    body: "Issuers sign registration and revocation transactions with their own wallet. ProofMesh never holds issuer keys.",
  },
];

const ROADMAP = [
  ["DIDs / Verifiable Credentials", "Standards-based identifiers and credential formats."],
  ["Zero-knowledge proofs", "Prove a claim holds without revealing the underlying data."],
  ["Selective disclosure", "Share only the fields a verifier actually needs."],
  ["Account abstraction", "Smoother issuer onboarding without raw key handling."],
];

function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="About"
        title="How ProofMesh works"
        description="A plain explanation of the verification model, the parts it depends on, and the claims it deliberately does not make."
      />

      <Container className="space-y-12 py-10 lg:py-16">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border lg:grid-cols-2">
          {LAYERS.map((layer) => (
            <article key={layer.name} className="bg-panel/70 p-6">
              <h2 className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-primary">
                {layer.name}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-subtle">{layer.body}</p>
            </article>
          ))}
        </div>

        <section className="space-y-4">
          <SectionLabel>Limitations</SectionLabel>
          <Alert tone="warning" title="A proof is narrow on purpose">
            Anchoring proves that a given fingerprint was registered by a given wallet at a
            given time. It does not prove that the statements inside the credential are
            true, that the issuer is legitimate, or that the person presenting it is the
            rightful holder. A hash mismatch means the file differs from the registered
            one — it is not, by itself, evidence of fraud.
          </Alert>
          <Alert tone="info" title="Current phase">
            This deployment is the frontend foundation. Database, IPFS, automation and the
            Sepolia contract are not connected, so no result shown anywhere in the app is a
            real verification.
          </Alert>
        </section>

        <section>
          <SectionLabel>Roadmap</SectionLabel>
          <Panel className="mt-5">
            <PanelHeader title="Planned, not implemented" description="Direction of travel after the on-chain phase." />
            <dl className="grid gap-px bg-border sm:grid-cols-2">
              {ROADMAP.map(([term, body]) => (
                <div key={term} className="bg-panel/70 p-5">
                  <dt className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-foreground">
                    {term}
                  </dt>
                  <dd className="mt-3 text-sm text-subtle">{body}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/verify">
            <Button variant="primary">Verify a credential</Button>
          </Link>
          <Link to="/settings">
            <Button>Review settings</Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
