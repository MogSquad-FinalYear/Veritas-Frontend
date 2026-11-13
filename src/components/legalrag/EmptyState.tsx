import { BadgeCheck, Library, Scale, ScrollText } from "lucide-react";

const EXAMPLES = [
  "What is the punishment for hacking under the IT Act?",
  "What constitutes cheating under Section 420?",
  "Explain the ingredients of dowry death under the law.",
  "What is the procedure for filing an FIR?",
];

const FEATURES: { icon: typeof Library; label: string }[] = [
  { icon: Library, label: "Searches the full text of Indian law" },
  { icon: BadgeCheck, label: "Flags outdated or repealed sections" },
  { icon: ScrollText, label: "Every answer names its source section" },
  { icon: Scale, label: "No guessing — only what the law actually says" },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lr-accent-soft)] text-[var(--lr-accent)]">
        <Scale className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--lr-text)] sm:text-[28px]">
        Ask a question grounded in Indian statute law
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-[var(--lr-text-muted)]">
        Answers cite the exact sections they draw from, warn when a cited
        section has been amended or repealed, and can be grounded in your own
        uploaded case documents.
      </p>

      <div className="mt-7 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLES.map((text) => (
          <button
            key={text}
            onClick={() => onPick(text)}
            className="rounded-lg border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-3.5 py-2.5 text-left text-[13px] text-[var(--lr-text)] transition-colors hover:border-[var(--lr-accent-line)] hover:bg-[var(--lr-accent-soft)]"
          >
            {text}
          </button>
        ))}
      </div>

      <div className="mt-7 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[var(--lr-text-muted)]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--lr-accent)]" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
