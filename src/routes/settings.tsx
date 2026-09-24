import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  DataRow,
  NetworkBadge,
  Panel,
  PanelHeader,
} from "@/components/pm/primitives";
import { Container, PageHeader, WalletButton } from "@/components/pm/site";
import { SEPOLIA } from "@/lib/proofmesh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ProofMesh" },
      {
        name: "description",
        content:
          "Wallet, network, security and appearance settings for your ProofMesh session.",
      },
      { property: "og:title", content: "Settings — ProofMesh" },
      {
        property: "og:description",
        content: "Session preferences and network configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

function Toggle({
  label,
  description,
  enabled,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
      <div>
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-foreground">
          {label}
        </p>
        <p className="mt-2 max-w-md text-sm text-subtle">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative mt-1 h-6 w-11 shrink-0 rounded-sm border transition-colors disabled:opacity-40",
          enabled ? "border-primary bg-primary/25" : "border-border bg-surface",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1 h-4 w-4 rounded-sm transition-all",
            enabled ? "left-6 bg-primary" : "left-1 bg-muted-foreground",
          )}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [monoData, setMonoData] = useState(true);

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Session-level preferences. Nothing here is stored on a server in this phase."
        actions={<WalletButton />}
      />

      <Container className="grid gap-6 py-10 lg:grid-cols-2 lg:py-14">
        <Panel>
          <PanelHeader title="Wallet" aside={<Badge>Disconnected</Badge>} />
          <dl>
            <DataRow label="Status">Not connected</DataRow>
            <DataRow label="Address">—</DataRow>
            <DataRow label="Provider">MetaMask (not implemented yet)</DataRow>
          </dl>
          <div className="p-4 sm:p-5">
            <Alert tone="info" title="Key safety">
              ProofMesh never asks for, stores or transmits private keys or seed phrases.
              Signing always happens inside your own wallet.
            </Alert>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Network" aside={<NetworkBadge />} />
          <dl>
            <DataRow label="Intended network">{SEPOLIA.name}</DataRow>
            <DataRow label="Chain ID">
              <span className="font-mono text-[0.78rem]">{SEPOLIA.chainId}</span>
            </DataRow>
            <DataRow label="Explorer">
              <span className="font-mono text-[0.78rem] break-all">
                {SEPOLIA.explorerBaseUrl}
              </span>
            </DataRow>
            <DataRow label="Contract">Not deployed yet</DataRow>
          </dl>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-subtle">
              Sepolia is a test network. Test ETH has no monetary value and proofs
              registered there are for evaluation.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Security" />
          <Toggle
            label="Require wallet for issuance"
            description="Registration always demands a signature from an authorized issuer wallet."
            enabled
            disabled
            onChange={() => undefined}
          />
          <Toggle
            label="Block sensitive fields"
            description="Identity numbers, biometrics and secrets are never requested or accepted."
            enabled
            disabled
            onChange={() => undefined}
          />
          <div className="p-4 sm:p-5">
            <Badge tone="accent">Enforced by design</Badge>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Appearance" />
          <Toggle
            label="Reduce motion"
            description="Minimise transitions and animated states. Your system preference is respected automatically."
            enabled={reducedMotion}
            onChange={setReducedMotion}
          />
          <Toggle
            label="Monospace technical data"
            description="Show hashes, addresses, transactions and CIDs in a monospace face."
            enabled={monoData}
            onChange={setMonoData}
          />
          <div className="p-4 sm:p-5">
            <p className="text-sm text-subtle">
              ProofMesh uses a single dark technical theme; there is no light mode.
            </p>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="About this build" />
          <dl>
            <DataRow label="Product">ProofMesh — credential verification</DataRow>
            <DataRow label="Phase">Phase 1 — frontend foundation</DataRow>
            <DataRow label="Connected services">None</DataRow>
          </dl>
          <div className="flex flex-wrap gap-2 p-4 sm:p-5">
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </div>
        </Panel>
      </Container>
    </div>
  );
}
