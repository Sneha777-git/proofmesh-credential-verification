import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Field,
  FileUpload,
  Panel,
  PanelHeader,
  ProgressSteps,
  SelectField,
  type StepState,
} from "@/components/pm/primitives";
import { Container, PageHeader, WalletButton } from "@/components/pm/site";
import { CREDENTIAL_TYPES, ISSUANCE_STEPS } from "@/lib/proofmesh";

export const Route = createFileRoute("/issue")({
  head: () => ({
    meta: [
      { title: "Issue a credential — ProofMesh" },
      {
        name: "description",
        content:
          "Authorized issuers register a credential fingerprint on Ethereum Sepolia with a connected wallet.",
      },
      { property: "og:title", content: "Issue a credential — ProofMesh" },
      {
        property: "og:description",
        content: "Hash a document, store it, and anchor its proof on-chain.",
      },
    ],
  }),
  component: IssuePage,
});

function IssuePage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>(CREDENTIAL_TYPES[0]!);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [attempted, setAttempted] = useState(false);

  const states: Record<string, StepState> = {};
  for (const step of ISSUANCE_STEPS) states[step] = "idle";
  if (file) states["FILE VALIDATED"] = "done";
  if (attempted) states["WAITING FOR WALLET"] = "failed";

  return (
    <div>
      <PageHeader
        eyebrow="Issuance"
        title="Issue a credential"
        description="Registration requires a connected issuer wallet. The document is fingerprinted locally; only the fingerprint and metadata are ever anchored on-chain."
        actions={<WalletButton />}
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="space-y-6">
          <Alert tone="warning" title="Wallet not connected">
            No issuer wallet is connected, and on-chain registration is not enabled in this
            phase. You can fill the form to see the flow, but nothing will be registered
            and no transaction will be created.
          </Alert>

          <Panel>
            <PanelHeader
              title="Credential details"
              description="Use only non-sensitive references. Never enter identity numbers or biometrics."
            />
            <div className="space-y-6 p-4 sm:p-5">
              <FileUpload
                label="Credential PDF"
                file={file}
                onFileChange={setFile}
                hint="PDF only. The file is hashed with SHA-256; the hash is what gets registered."
              />
              <SelectField
                label="Credential type"
                options={CREDENTIAL_TYPES}
                value={type}
                onChange={(event) => setType(event.target.value)}
              />
              <Field
                label="Credential title"
                placeholder="e.g. Backend Engineering Internship"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Field
                label="Recipient reference"
                mono
                placeholder="e.g. ROLL-2291 or internal ID"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                hint="A non-sensitive internal reference only."
              />

              <div className="flex items-start gap-3 rounded-sm border border-border bg-surface/60 p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <p className="text-sm text-subtle">
                  Never submit Aadhaar, PAN, passport numbers, biometrics, passwords, seed
                  phrases or private keys. ProofMesh does not need them and will never ask
                  for them.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setAttempted(true)}>
                  Register credential
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setReference("");
                    setTitle("");
                    setAttempted(false);
                  }}
                >
                  Reset form
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Issuance progress"
              description="Each stage reports independently, so a failure is always attributable."
              aside={<Badge tone={attempted ? "warning" : "neutral"}>{attempted ? "Halted" : "Idle"}</Badge>}
            />
            <ProgressSteps steps={ISSUANCE_STEPS} states={states} />
            {attempted ? (
              <div className="p-4 sm:p-5">
                <Alert tone="warning" title="Stopped at wallet signature">
                  A wallet signature is required and the wallet layer is not implemented
                  yet. No transaction was created and no credential was registered.
                </Alert>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="What issuers should know" />
            <div className="space-y-3 p-4 text-sm text-subtle sm:p-5">
              <p>
                Registration is a public act: the fingerprint, your issuer wallet and the
                timestamp are visible to anyone.
              </p>
              <p>
                Revocation does not delete history. It records that a previously registered
                credential is no longer considered valid.
              </p>
              <p>
                Keep the exact file you registered. A re-saved or re-exported PDF produces a
                different hash and will not match.
              </p>
              <Link to="/about">
                <Button size="sm" variant="ghost">
                  Read the model and its limits
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      </Container>
    </div>
  );
}
