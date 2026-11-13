import type { Citation } from "../../lib/api/legalrag";
import { validityTone } from "./ui";

const TOKEN_RE = /\[([A-Za-z0-9_./-]{2,40})\]/g;

const TONE_CLASS: Record<string, string> = {
  success: "bg-[var(--lr-success-soft)] text-[var(--lr-success)]",
  warning: "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]",
  danger: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]",
  info: "bg-[var(--lr-info-soft)] text-[var(--lr-info)]",
  brand: "bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]",
  neutral: "bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]",
};

/** The backend embeds citations as inline bracket tokens, e.g. "...under
 * [IPC_420]." — turn each into a chip that jumps to the matching citation
 * card below, and leave unmatched tokens as plain faint text. */
export function AnswerText({
  text,
  citations,
  messageId,
}: {
  text: string;
  citations: Citation[];
  messageId: string;
}) {
  const bySection = new Map(citations.map((c) => [c.section_id.toUpperCase(), c]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const sectionId = m[1];
    const citation = bySection.get(sectionId.toUpperCase());
    if (citation) {
      parts.push(
        <a
          key={`c-${key++}`}
          href={`#citation-${messageId}-${citation.section_id}`}
          className={`rounded px-1.5 py-0.5 font-mono text-[11.5px] font-medium no-underline ${TONE_CLASS[validityTone(citation.validity)]}`}
        >
          [{sectionId}]
        </a>,
      );
    } else {
      parts.push(
        <span key={`c-${key++}`} className="font-mono text-[11.5px] text-[var(--lr-text-faint)]">
          [{sectionId}]
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--lr-text)]">
      {parts}
    </p>
  );
}
