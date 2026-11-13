import { Check, Loader2, X, HelpCircle } from "lucide-react";

const CONFIG: Record<string, { label: string; icon: typeof Check; className: string; spin?: boolean }> = {
  processing: { label: "Processing", icon: Loader2, className: "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]", spin: true },
  completed: { label: "Ready", icon: Check, className: "bg-[var(--lr-success-soft)] text-[var(--lr-success)]" },
  failed: { label: "Failed", icon: X, className: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]" },
  missing: { label: "Missing", icon: HelpCircle, className: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]" },
};

export function StatusBadge({
  status,
  message,
}: {
  status: string;
  message?: string;
}) {
  const cfg = CONFIG[status] ?? CONFIG.processing;
  const Icon = cfg.icon;
  return (
    <span
      title={message || cfg.label}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cfg.className}`}
    >
      <Icon className={`h-2.5 w-2.5 ${cfg.spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}
