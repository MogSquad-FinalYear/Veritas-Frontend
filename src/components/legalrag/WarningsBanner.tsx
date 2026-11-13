import { AlertTriangle } from "lucide-react";

export function WarningsBanner({ warnings }: { warnings: string[] }) {
  const unique = [...new Set(warnings.filter(Boolean))];
  if (unique.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--lr-warning)]/20 bg-[var(--lr-warning-soft)] px-3.5 py-3">
      <div className="space-y-1.5">
        {unique.map((w, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[var(--lr-warning)]">
            <AlertTriangle className="mt-0.5 h-[13px] w-[13px] shrink-0" />
            <span>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
