import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { Citation } from "../../lib/api/legalrag";
import { CopyButton, LrBadge, validityTone } from "./ui";

export function CitationList({
  citations,
  messageId,
}: {
  citations: Citation[];
  messageId: string;
}) {
  if (citations.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--lr-text-faint)]">
        Citations · {citations.length}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {citations.map((c, i) => (
          <CitationCard key={`${c.section_id}-${i}`} citation={c} messageId={messageId} />
        ))}
      </div>
    </div>
  );
}

function CitationCard({ citation, messageId }: { citation: Citation; messageId: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = citation.content.length > 220;

  return (
    <div
      id={`citation-${messageId}-${citation.section_id}`}
      className="group scroll-mt-20 rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-3"
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-[var(--lr-bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--lr-text)]">
          {citation.section_id}
        </span>
        <LrBadge tone={validityTone(citation.validity)} dot>
          {citation.validity}
        </LrBadge>
        {citation.category && <LrBadge tone="neutral">{citation.category}</LrBadge>}
        <CopyButton
          text={`${citation.section_id} — ${citation.act_name}\n${citation.content}`}
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
      <p className="mt-1.5 text-[13px] italic text-[var(--lr-text-muted)]">
        {citation.act_name}
      </p>
      <p
        className={`mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--lr-text)] ${
          long && !expanded ? "line-clamp-3" : ""
        }`}
      >
        {citation.content}
      </p>
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--lr-accent)]"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
      {citation.warning && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--lr-warning-soft)] px-2.5 py-1.5 text-[11px] text-[var(--lr-warning)]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {citation.warning}
        </div>
      )}
    </div>
  );
}
