import { useEffect, useState } from "react";
import { AlertCircle, Scale, User } from "lucide-react";
import type { ChatMessage } from "../../lib/legalragHistory";
import { AnswerCard } from "./AnswerCard";

const THINKING_STEPS = [
  "Understanding your question",
  "Searching Indian law for relevant sections",
  "Checking which sections actually apply",
  "Writing an answer with citations",
];

export function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--lr-brand)] px-4 py-2.5 text-[14px] text-[var(--lr-brand-contrast)]">
          {message.text}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }
  if (message.role === "pending") return <PendingRow />;
  if (message.role === "error") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-[var(--lr-danger)]/20 bg-[var(--lr-danger-soft)] px-4 py-2.5 text-[13.5px] text-[var(--lr-danger)]">
          {message.text}
        </div>
      </div>
    );
  }
  return <AnswerCard id={message.id} answer={message.answer} />;
}

function PendingRow() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THINKING_STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]">
        <Scale className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--lr-accent)] lr-dot-pulse" />
        <span aria-live="polite" className="text-[13px] text-[var(--lr-text-muted)]">
          {THINKING_STEPS[step]}
        </span>
      </div>
    </div>
  );
}
