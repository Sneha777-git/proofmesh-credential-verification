import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QrCode, ScanLine } from "lucide-react";
import { useState } from "react";

import {
  Alert,
  Button,
  Field,
  FileUpload,
  Panel,
  PanelHeader,
} from "@/components/pm/primitives";
import { Container, PageHeader } from "@/components/pm/site";
import {
  OUTCOME_PREVIEWS,
  VerificationResultView,
} from "@/components/pm/verification";
import { CREDENTIAL_ID_PATTERN } from "@/lib/proofmesh";
import { useVerifyRecord } from "@/lib/use-verify";
import { sha256File } from "@/lib/web3/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "Verify a credential — ProofMesh" },
      {
        name: "description",
        content:
          "Check a credential by ID, QR code or original PDF against its registered blockchain proof.",
      },
      { property: "og:title", content: "Verify a credential — ProofMesh" },
      {
        property: "og:description",
        content: "Independent credential verification against an on-chain proof.",
      },
    ],
  }),
  component: VerifyPage,
});

type Method = "id" | "qr" | "document";

const METHODS: { key: Method; label: string; hint: string }[] = [
  { key: "id", label: "Credential ID", hint: "Fastest if you have the reference" },
  { key: "qr", label: "QR code", hint: "Scan or upload the printed code" },
  { key: "document", label: "Document", hint: "Compare the file itself" },
];

function VerifyPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("id");
  const [credentialId, setCredentialId] = useState("");
  const [idError, setIdError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const { outcome, setOutcome, credential, chain, uploadedHash, message, run: lookup } = useVerifyRecord();
  const [previewMessage, setPreviewMessage] = useState<string | undefined>(undefined);

  async function run() {
    setPreviewMessage(undefined);
    if (method === "qr") {
      setOutcome("error");
      setPreviewMessage("QR decoding is not enabled yet. Enter the credential ID printed under the code instead.");
      return;
    }
    const id = credentialId.trim().toUpperCase();
    if (!CREDENTIAL_ID_PATTERN.test(id)) {
      setIdError("Use the format PM-000001.");
      return;
    }
    setIdError(null);
    if (method === "document") {
      if (!file) {
        setOutcome("error");
        setPreviewMessage("Choose the original PDF to compare its fingerprint.");
        return;
      }
      const hash = await sha256File(file);
      void lookup(id, "document", hash);
      return;
    }
    void lookup(id, "credential_id");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Verification"
        title="Verify a credential"
        description="Three ways to check the same thing: whether a credential's fingerprint is registered on-chain, and whether your copy of the document still matches it."
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:py-14">
        <div className="space-y-6">
          <Panel>
            <div role="tablist" aria-label="Verification method" className="grid grid-cols-3 gap-px bg-border">
              {METHODS.map((item) => (
                <button
                  key={item.key}
                  role="tab"
                  type="button"
                  aria-selected={method === item.key}
                  onClick={() => {
                    setMethod(item.key);
                    setOutcome("idle");
                  }}
                  className={cn(
                    "bg-panel px-2 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors sm:text-[0.7rem]",
                    method === item.key
                      ? "bg-primary/10 text-primary"
                      : "text-subtle hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <p className="text-xs text-muted-foreground">
                {METHODS.find((m) => m.key === method)?.hint}
              </p>

              {method === "id" || method === "document" ? (
                <Field
                  label="Credential ID"
                  mono
                  placeholder="PM-000001"
                  value={credentialId}
                  onChange={(event) => setCredentialId(event.target.value)}
                  aria-invalid={Boolean(idError)}
                  hint={idError ?? "Printed on the credential, e.g. PM-000001."}
                />
              ) : null}

              {method === "qr" ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border-strong bg-surface/60 p-6 text-center">
                    <QrCode className="h-6 w-6 text-subtle" aria-hidden />
                    <p className="text-sm text-subtle">
                      Camera scanning is not enabled in this phase.
                    </p>
                    <Button size="sm" disabled>
                      <ScanLine className="h-3.5 w-3.5" aria-hidden />
                      Open scanner
                    </Button>
                  </div>
                  <FileUpload
                    label="Or upload a QR image"
                    accept="image/*"
                    file={qrFile}
                    onFileChange={setQrFile}
                    hint="The QR code only ever contains the public verification URL — no personal data."
                  />
                </div>
              ) : null}

              {method === "document" ? (
                <FileUpload
                  label="Credential PDF"
                  file={file}
                  onFileChange={setFile}
                  hint="Hashed with SHA-256 in your browser; only the fingerprint is compared with the on-chain value. The file never leaves your device."
                />
              ) : null}

              <Button variant="primary" className="w-full" onClick={() => void run()}>
                Verify
              </Button>
              <p className="text-xs text-muted-foreground">
                Reads the ProofMesh contract on Ethereum Sepolia Testnet. No wallet needed.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Demo mode — result layouts"
              description="Shows how each result is laid out. Clearly marked DEMO MODE; never real verification results or blockchain data."
            />
            <div className="flex flex-wrap gap-2 p-4 sm:p-5">
              {OUTCOME_PREVIEWS.map((item) => (
                <Button
                  key={item.outcome}
                  size="sm"
                  variant={outcome === item.outcome ? "primary" : "outline"}
                  onClick={() => {
                    setPreviewMessage("DEMO MODE — layout preview only. No lookup was performed and nothing shown here is real data.");
                    setOutcome(item.outcome);
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setOutcome("idle")}>
                Reset
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <VerificationResultView
            outcome={outcome}
            credentialId={method !== "qr" ? credentialId.toUpperCase() || undefined : undefined}
            credential={previewMessage ? null : credential}
            chain={previewMessage ? null : chain}
            uploadedHash={previewMessage ? null : uploadedHash}
            message={previewMessage ?? message}
            onRetry={() => setOutcome("idle")}
          />
          <Alert tone="info" title="Shareable verification link">
            Every credential has a public page at /verify/PM-000001 that anyone can open
            without an account or wallet.
            <div className="mt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate({
                    to: "/verify/$credentialId",
                    params: { credentialId: "PM-000001" },
                  })
                }
              >
                Open an example link
              </Button>
            </div>
          </Alert>
        </div>
      </Container>
    </div>
  );
}
