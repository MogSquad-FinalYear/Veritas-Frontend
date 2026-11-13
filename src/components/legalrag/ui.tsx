import { useState } from "react";
import { Check, Copy } from "lucide-react";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[var(--lr-success-soft)] text-[var(--lr-success)]",
  warning: "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]",
  danger: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]",
  info: "bg-[var(--lr-info-soft)] text-[var(--lr-info)]",
  brand: "bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]",
  neutral: "bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]",
};

const DOT_CLASS: Record<Tone, string> = {
  success: "bg-[var(--lr-success)]",
  warning: "bg-[var(--lr-warning)]",
  danger: "bg-[var(--lr-danger)]",
  info: "bg-[var(--lr-info)]",
  brand: "bg-[var(--lr-brand)]",
  neutral: "bg-[var(--lr-text-faint)]",
};

export function validityTone(validity: string): Tone {
  if (validity === "active") return "success";
  if (validity === "amended") return "warning";
  if (validity === "repealed" || validity === "superseded") return "danger";
  return "neutral";
}

export function LrBadge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium uppercase leading-5 tracking-wide ${TONE_CLASS[tone]}`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${DOT_CLASS[tone]}`} />}
      {children}
    </span>
  );
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function initials(id: string): string {
  const tokens = id.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  return tokens
    .slice(0, 2)
    .map((t) => t[0]!.toUpperCase())
    .join("");
}

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`rounded p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)] ${className}`}
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
