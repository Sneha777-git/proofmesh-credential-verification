import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Copy,
  FileUp,
  Info,
  Loader2,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import type { CredentialStatus } from "@/lib/proofmesh";

/* ---------------------------------------------------------------- button */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-mono text-[0.72rem] uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:border-primary hover:text-primary",
        ghost: "text-subtle hover:bg-surface hover:text-foreground",
        danger:
          "border border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[0.8rem]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

/* ----------------------------------------------------------------- panel */

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-sm border border-border bg-panel/70", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div>
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-subtle">{description}</p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="label-mono flex items-center gap-2">
      <span aria-hidden className="inline-block h-px w-6 bg-border-strong" />
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------- badge */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        neutral: "border-border text-subtle",
        accent: "border-primary/45 bg-primary/10 text-primary",
        danger: "border-destructive/45 bg-destructive/10 text-destructive",
        warning: "border-warning/45 bg-warning/10 text-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  tone,
  className,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

const STATUS_META: Record<
  CredentialStatus,
  { label: string; tone: "accent" | "danger" | "warning" | "neutral"; Icon: typeof Check }
> = {
  registered: { label: "Registered", tone: "accent", Icon: ShieldCheck },
  revoked: { label: "Revoked", tone: "danger", Icon: ShieldOff },
  pending: { label: "Pending", tone: "warning", Icon: CircleDashed },
  unknown: { label: "Unknown", tone: "neutral", Icon: Info },
};

/** Status is conveyed by icon + text, never colour alone. */
export function StatusBadge({ status }: { status: CredentialStatus }) {
  const { label, tone, Icon } = STATUS_META[status];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function NetworkBadge({ name = "Sepolia Testnet" }: { name?: string }) {
  return (
    <Badge tone="neutral" className="gap-2">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
      {name}
    </Badge>
  );
}

/* ----------------------------------------------------------------- input */

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  mono?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, mono, className, id, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="label-mono block">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-describedby={hintId}
        className={cn(
          "h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none",
          mono && "font-mono tracking-wide",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function SelectField({
  label,
  hint,
  options,
  ...props
}: {
  label: string;
  hint?: string;
  options: readonly string[];
} & InputHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-mono block">
        {label}
      </label>
      <select
        id={id}
        className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- alert */

const alertVariants = cva("flex gap-3 rounded-sm border p-4 text-sm", {
  variants: {
    tone: {
      info: "border-border bg-surface text-subtle",
      accent: "border-primary/35 bg-primary/5 text-foreground",
      warning: "border-warning/40 bg-warning/5 text-foreground",
      danger: "border-destructive/40 bg-destructive/5 text-foreground",
    },
  },
  defaultVariants: { tone: "info" },
});

const ALERT_ICON = {
  info: Info,
  accent: ShieldCheck,
  warning: AlertTriangle,
  danger: X,
} as const;

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof ALERT_ICON;
  title: string;
  children?: ReactNode;
}) {
  const Icon = ALERT_ICON[tone];
  return (
    <div className={alertVariants({ tone })} role="note">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-current" aria-hidden />
      <div className="space-y-1">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em]">{title}</p>
        {children ? <div className="text-sm text-subtle">{children}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- copy + mono data */

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border text-subtle transition-colors hover:border-primary hover:text-primary"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function MonoValue({
  value,
  copyLabel,
  className,
}: {
  value: string;
  copyLabel?: string;
  className?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code
        className={cn(
          "min-w-0 break-all font-mono text-[0.78rem] text-foreground",
          className,
        )}
      >
        {value}
      </code>
      {copyLabel ? <CopyButton value={value} label={copyLabel} /> : null}
    </span>
  );
}

export function DataRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-center sm:gap-4 sm:px-5">
      <dt className="label-mono">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------ file upload */

export function FileUpload({
  label,
  hint,
  accept = "application/pdf",
  file,
  onFileChange,
}: {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const id = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-mono block">
        {label}
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onFileChange(dropped);
        }}
        className={cn(
          "rounded-sm border border-dashed p-5 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border-strong bg-surface/60",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <p className="break-all font-mono text-[0.78rem] text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB selected
            </p>
            <Button size="sm" variant="ghost" onClick={() => onFileChange(null)}>
              Remove file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileUp className="h-5 w-5 text-subtle" aria-hidden />
            <p className="text-sm text-subtle">Drag a PDF here, or choose a file</p>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
          </div>
        )}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------- progress steps */

export type StepState = "idle" | "active" | "done" | "failed";

export function ProgressSteps({
  steps,
  states,
}: {
  steps: readonly string[];
  states: Record<string, StepState>;
}) {
  return (
    <ol className="space-y-px">
      {steps.map((step, index) => {
        const state = states[step] ?? "idle";
        return (
          <li
            key={step}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5"
          >
            <span className="label-mono w-6 shrink-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span aria-hidden className="shrink-0">
              {state === "done" ? (
                <Check className="h-4 w-4 text-primary" />
              ) : state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : state === "failed" ? (
                <X className="h-4 w-4 text-destructive" />
              ) : (
                <CircleDashed className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <span
              className={cn(
                "font-mono text-[0.72rem] uppercase tracking-[0.14em]",
                state === "idle" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step}
            </span>
            <span className="label-mono ml-auto hidden sm:inline">
              {state === "idle" ? "pending" : state}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------- empty / loading states */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <CircleDashed className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h3 className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-foreground">
        {title}
      </h3>
      <p className="max-w-md text-sm text-subtle">{description}</p>
      {action}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-px" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse border-b border-border bg-surface/50 last:border-b-0"
        />
      ))}
    </div>
  );
}
