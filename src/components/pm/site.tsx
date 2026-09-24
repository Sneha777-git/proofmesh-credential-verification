import { Link } from "@tanstack/react-router";
import { Menu, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Alert, Badge, Button, NetworkBadge } from "@/components/pm/primitives";
import { SEPOLIA } from "@/lib/proofmesh";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/verify", label: "Verify" },
  { to: "/issue", label: "Issue" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
] as const;

/**
 * Wallet UI only. No provider is wired up in Phase 1, so this never claims a
 * connected wallet — it explains that connection arrives with the next phase.
 */
export function WalletButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wallet = useWallet();
  const label =
    wallet.status === "connected" && wallet.address
      ? wallet.wrongNetwork
        ? "Wrong network"
        : truncateMiddle(wallet.address, 6, 4)
      : wallet.status === "connecting"
        ? "Connecting…"
        : "Connect wallet";
  return (
    <div className={cn("relative", className)}>
      <Button
        variant={wallet.wrongNetwork ? "danger" : wallet.status === "connected" ? "outline" : "primary"}
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden />
        <span className={wallet.status === "connected" && !wallet.wrongNetwork ? "font-mono normal-case" : ""}>
          {label}
        </span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-sm border border-border bg-panel p-4 shadow-lift">
          <p className="label-mono">Wallet status</p>
          {wallet.status === "unsupported" ? (
            <p className="mt-2 text-sm text-subtle">
              No browser wallet detected. Install MetaMask to issue or revoke. Verifying
              credentials never needs a wallet.
            </p>
          ) : wallet.status === "connected" && wallet.address ? (
            <div className="mt-2 space-y-2">
              <p className="break-all font-mono text-[0.72rem] text-foreground">{wallet.address}</p>
              {wallet.wrongNetwork ? (
                <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-destructive">
                    Wrong network
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    Connected to chain {wallet.chainId}. ProofMesh only submits to {CHAIN_LABEL}.
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => void wallet.switchToSepolia()}>
                    Switch to Sepolia
                  </Button>
                </div>
              ) : (
                <Badge tone="accent">{CHAIN_LABEL}</Badge>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-subtle">
              Not connected. ProofMesh will never ask for a seed phrase, private key or wallet
              password — every transaction is approved inside your wallet.
            </p>
          )}
          {wallet.error ? <p className="mt-2 text-xs text-warning">{wallet.error}</p> : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            {wallet.status === "connected" ? (
              <Button size="sm" variant="ghost" onClick={wallet.disconnect}>
                Disconnect
              </Button>
            ) : wallet.status !== "unsupported" ? (
              <Button size="sm" variant="primary" loading={wallet.status === "connecting"} onClick={() => void wallet.connect()}>
                Connect
              </Button>
            ) : (
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                <Button size="sm">Get MetaMask</Button>
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="ProofMesh home">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-sm border border-primary/50 bg-primary/10">
            <span className="h-2 w-2 rotate-45 bg-primary" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground">
            PROOFMESH
          </span>
        </Link>

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-sm px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-subtle transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline">
            <NetworkBadge />
          </span>
          <span className="hidden sm:inline">
            <WalletButton />
          </span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-sm border border-border text-subtle lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background lg:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <ul className="space-y-px">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block border-b border-border py-3 font-mono text-[0.78rem] uppercase tracking-[0.16em] text-subtle"
                    activeProps={{ className: "text-primary" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3">
              <WalletButton />
              <NetworkBadge />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-mono text-sm tracking-[0.2em] text-foreground">PROOFMESH</p>
          <p className="mt-3 max-w-sm text-sm text-subtle">
            Independent verification of credential proofs anchored to a public
            blockchain. Frontend foundation — on-chain registration is not live yet.
          </p>
        </div>
        <div>
          <p className="label-mono">Product</p>
          <ul className="mt-3 space-y-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-subtle hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/settings" className="text-sm text-subtle hover:text-foreground">
                Settings
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="label-mono">Network</p>
          <p className="mt-3 font-mono text-sm text-foreground">{SEPOLIA.name}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            chainId {SEPOLIA.chainId}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Testnet only. Never share private keys or seed phrases.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <p className="label-mono">{eyebrow}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h1 className="max-w-2xl text-3xl font-semibold uppercase tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-subtle sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PhaseNotice({ children }: { children: ReactNode }) {
  return (
    <Alert tone="warning" title="Not connected yet">
      {children}
    </Alert>
  );
}

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
