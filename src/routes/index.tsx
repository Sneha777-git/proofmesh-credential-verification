import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Binary, Database, FileText, Link2, ShieldCheck } from "lucide-react";

import { Alert, Badge, Button, Panel, SectionLabel } from "@/components/pm/primitives";
import { Container } from "@/components/pm/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProofMesh — Verify Trust. Prove Authenticity." },
      {
        name: "description",
        content:
          "ProofMesh anchors credential fingerprints to Ethereum Sepolia so anyone can verify a document independently.",
      },
      { property: "og:title", content: "ProofMesh — Verify Trust. Prove Authenticity." },
      {
        property: "og:description",
        content:
          "Document to SHA-256 hash to blockchain proof to independent verification.",
      },
    ],
  }),
  component: Home,
});

const FLOW = [
  { label: "Document", Icon: FileText },
  { label: "Cryptographic hash", Icon: Binary },
  { label: "Blockchain proof", Icon: Link2 },
  { label: "Verifiable credential", Icon: ShieldCheck },
];

const STEPS = [
  {
    name: "Issue",
    body: "An authorized issuer prepares a credential document for registration.",
  },
  {
    name: "Fingerprint",
    body: "The document is hashed with SHA-256. The file itself never needs to be public.",
  },
  {
    name: "Anchor",
    body: "The fingerprint is written to a smart contract on Ethereum Sepolia.",
  },
  {
    name: "Verify",
    body: "Anyone recomputes the hash and compares it with the registered proof.",
  },
  {
    name: "Revoke",
    body: "An issuer can mark a credential invalid without erasing its history.",
  },
];

const TECH = [
  { name: "Ethereum Sepolia", role: "Public test network for proof anchoring" },
  { name: "Smart contracts", role: "Registry of credential fingerprints" },
  { name: "SHA-256", role: "Document fingerprinting" },
  { name: "IPFS", role: "Content-addressed document storage" },
  { name: "Supabase", role: "Issuer records and application data" },
  { name: "n8n", role: "Issuance and revocation automation" },
  { name: "MetaMask", role: "Issuer wallet signing" },
];

function Home() {
  return (
    <div>
      <section className="noise relative overflow-hidden border-b border-border">
        <div aria-hidden className="grid-texture absolute inset-0" />
        <Container className="relative py-20 lg:py-28">
          <Badge tone="accent">Decentralized credential verification</Badge>
          <h1 className="mt-8 max-w-4xl text-4xl font-semibold uppercase leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Verify trust.
            <br />
            <span className="text-primary">Prove authenticity.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-subtle">
            ProofMesh turns a credential document into a cryptographic fingerprint,
            registers that fingerprint on a public blockchain, and lets anyone check a
            document against it — without trusting ProofMesh, the issuer's website, or a
            PDF that can be edited.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/verify">
              <Button variant="primary" size="lg">
                Verify a credential
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link to="/issue">
              <Button size="lg">Issue a credential</Button>
            </Link>
          </div>

          <ol className="mt-16 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((item, index) => (
              <li key={item.label} className="bg-panel/80 p-5">
                <div className="flex items-center justify-between">
                  <item.Icon className="h-4 w-4 text-primary" aria-hidden />
                  <span className="label-mono">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-foreground">
                  {item.label}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <SectionLabel>The problem</SectionLabel>
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-tight sm:text-3xl">
              A PDF is not evidence
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-subtle">
              Digital credentials can be modified, forged, or simply impossible to check
              independently. Verification usually means emailing an institution and waiting
              — or trusting a logo on a page that anyone could copy.
            </p>
            <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
              {[
                ["Editable", "Documents can be altered after issuance."],
                ["Unverifiable", "No neutral record to compare against."],
                ["Slow", "Manual checks take days and don't scale."],
              ].map(([title, body]) => (
                <div key={title} className="bg-panel/70 p-5">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-primary">
                    {title}
                  </p>
                  <p className="mt-3 text-sm text-subtle">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-16 lg:py-24">
          <SectionLabel>How it works</SectionLabel>
          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <div key={step.name} className="bg-panel/70 p-5">
                <span className="label-mono">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-4 font-mono text-[0.8rem] uppercase tracking-[0.16em] text-foreground">
                  {step.name}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-subtle">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <SectionLabel>Technology</SectionLabel>
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-tight sm:text-3xl">
              Built on public infrastructure
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-subtle">
              Every layer is either a public network or a replaceable service, so proofs
              stay checkable even without ProofMesh.
            </p>
          </div>
          <Panel className="divide-y divide-border">
            {TECH.map((item) => (
              <div
                key={item.name}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <p className="font-mono text-[0.78rem] uppercase tracking-[0.14em] text-foreground">
                  {item.name}
                </p>
                <p className="text-sm text-subtle">{item.role}</p>
              </div>
            ))}
          </Panel>
        </Container>
      </section>

      <section>
        <Container className="grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <SectionLabel>Limitations</SectionLabel>
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-tight sm:text-3xl">
              What a proof does not mean
            </h2>
          </div>
          <div className="space-y-4">
            <Alert tone="warning" title="Registration is not endorsement">
              A blockchain record proves that a specific fingerprint was registered by a
              specific wallet at a specific time. It does not prove that the claims written
              inside the document are true, that the issuer is trustworthy, or that the
              recipient is who they say they are.
            </Alert>
            <Alert tone="info" title="Phase status">
              ProofMesh is currently a frontend foundation. Database, IPFS, automation and
              on-chain registration are not connected yet, and no verification results are
              real.
              <div className="mt-3">
                <Link to="/about">
                  <Button size="sm" variant="ghost">
                    Read the full explanation
                  </Button>
                </Link>
              </div>
            </Alert>
            <div className="flex items-center gap-3 rounded-sm border border-border bg-surface/60 p-4">
              <Database className="h-4 w-4 text-subtle" aria-hidden />
              <p className="text-sm text-subtle">
                ProofMesh never asks for identity documents, biometrics, passwords, seed
                phrases or private keys.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
