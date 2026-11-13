import { AlertTriangle, Scale } from "lucide-react";
import { useState } from "react";
import type { QueryResponse } from "../../lib/api/legalrag";
import type { Citation } from "../../lib/api/legalrag";
import { AnswerText } from "./AnswerText";
import { WarningsBanner } from "./WarningsBanner";
import { CopyButton, LrBadge, validityTone } from "./ui";

export function AnswerCard({ id, answer }: { id: string; answer: QueryResponse }) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]">
        <Scale className="h-4 w-4" />
      </div>
      <div className="animate-fade-in max-w-[88%] rounded-2xl rounded-tl-sm border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-4 shadow-sm sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {answer.case_id && <LrBadge tone="info">case: {answer.case_id}</LrBadge>}
          <span className="ml-auto flex items-center">
            <CopyButton text={answer.answer} />
          </span>
        </div>

        <AnswerText
          text={answer.answer}
          citations={answer.citations}
          onCitationClick={setSelectedCitation}
        />

        {answer.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--lr-border)] pt-3.5">
            <span className="text-sm font-semibold text-[var(--lr-text)]">Based on:</span>
            {answer.citations.map((citation) => (
              <button
                key={citation.section_id}
                onClick={() => setSelectedCitation(citation)}
                className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-opacity hover:opacity-75 ${citationTone(citation.validity)}`}
              >
                [{citation.section_id}]
              </button>
            ))}
          </div>
        )}

        {answer.warnings.length > 0 && (
          <div className="mt-3">
            <WarningsBanner warnings={answer.warnings} />
          </div>
        )}

      </div>
      {selectedCitation && (
        <CitationDialog
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}

function citationTone(validity: string) {
  const tone = validityTone(validity);
  return {
    success: "bg-[var(--lr-success-soft)] text-[var(--lr-success)]",
    warning: "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]",
    danger: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]",
    info: "bg-[var(--lr-info-soft)] text-[var(--lr-info)]",
    brand: "bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]",
    neutral: "bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]",
  }[tone];
}

function CitationDialog({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close citation details"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-dialog-title"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] shadow-2xl animate-fade-in"
      >
        <div className="flex items-start justify-between border-b border-[var(--lr-border)] px-5 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-[var(--lr-text-muted)]">
              {citation.section_id}
            </p>
            <h2
              id="citation-dialog-title"
              className="mt-1 text-base font-semibold text-[var(--lr-text)]"
            >
              Citation details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
            aria-label="Close citation details"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <LrBadge tone={validityTone(citation.validity)} dot>
              {citation.validity}
            </LrBadge>
            {citation.category && <LrBadge tone="neutral">{citation.category}</LrBadge>}
          </div>
          <p className="text-sm italic text-[var(--lr-text-muted)]">{citation.act_name}</p>
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--lr-text)]">
            {citation.content}
          </p>
          {citation.warning && (
            <div className="flex items-start gap-2 rounded-xl bg-[var(--lr-warning-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--lr-warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{citation.warning}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
