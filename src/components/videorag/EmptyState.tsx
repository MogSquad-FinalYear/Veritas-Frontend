import { BadgeCheck, Clapperboard, ImageIcon, ScanSearch, Users } from "lucide-react";

const EXAMPLES = [
  "What objects appear in the video?",
  "When did someone speak about a weapon?",
  "Show me frames with a person walking",
];

const FEATURES: { icon: typeof ScanSearch; label: string }[] = [
  { icon: ScanSearch, label: "Searches frames, speech, and on-screen text" },
  { icon: BadgeCheck, label: "Checks every cited timestamp against the footage" },
  { icon: Users, label: "Flags contradictions between testimony in a case" },
  { icon: ImageIcon, label: "Finds frames matching a reference image" },
];

const EXAMPLE_CLASS =
  "rounded-lg border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-3.5 py-2.5 text-left text-[13px] text-[var(--lr-text)] transition-colors hover:border-[var(--lr-accent-line)] hover:bg-[var(--lr-accent-soft)]";

/** Mirrors Legal RAG's home screen so the two chat tools feel like one
 * product — same icon, headline, examples and features. */
export function EmptyState({
  onPick,
  onPickImage,
}: {
  onPick: (text: string) => void;
  onPickImage: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lr-accent-soft)] text-[var(--lr-accent)]">
        <Clapperboard className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--lr-text)] sm:text-[28px]">
        Ask a question grounded in your video evidence
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-[var(--lr-text-muted)]">
        Answers point to the exact moments they draw from, verify each cited
        timestamp against the footage, and can be scoped to a single video or
        started from a reference image.
      </p>

      <div className="mt-7 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLES.map((text) => (
          <button key={text} onClick={() => onPick(text)} className={EXAMPLE_CLASS}>
            {text}
          </button>
        ))}
        <button onClick={onPickImage} className={EXAMPLE_CLASS}>
          Upload an image to identify a person or object
        </button>
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
