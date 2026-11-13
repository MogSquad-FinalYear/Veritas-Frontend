import { Scale } from "lucide-react";
import type { QueryResponse } from "../../lib/api/legalrag";
import { AnswerText } from "./AnswerText";
import { CitationList } from "./CitationList";
import { IracBars } from "./IracBars";
import { WarningsBanner } from "./WarningsBanner";
import { CopyButton, LrBadge, confidenceTone, formatMs } from "./ui";

export function AnswerCard({ id, answer }: { id: string; answer: QueryResponse }) {
  const hasIrac = Object.keys(answer.irac_summary || {}).length > 0;
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]">
        <Scale className="h-4 w-4" />
      </div>
      <div className="animate-fade-in max-w-[88%] rounded-2xl rounded-tl-sm border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-4 shadow-sm sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <LrBadge tone={confidenceTone(answer.confidence)} dot>
            {answer.confidence} confidence
          </LrBadge>
          {answer.intent && <LrBadge tone="brand">{answer.intent}</LrBadge>}
          {answer.case_id && <LrBadge tone="info">case: {answer.case_id}</LrBadge>}
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--lr-text-faint)]">
            {formatMs(answer.elapsed_ms)}
            <CopyButton text={answer.answer} />
          </span>
        </div>

        <AnswerText text={answer.answer} citations={answer.citations} messageId={id} />

        {answer.warnings.length > 0 && (
          <div className="mt-3">
            <WarningsBanner warnings={answer.warnings} />
          </div>
        )}

        {hasIrac && (
          <div className="mt-3.5 border-t border-[var(--lr-border)] pt-3.5">
            <IracBars summary={answer.irac_summary} />
          </div>
        )}

        {answer.citations.length > 0 && (
          <div className="mt-3.5 border-t border-[var(--lr-border)] pt-3.5">
            <CitationList citations={answer.citations} messageId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
