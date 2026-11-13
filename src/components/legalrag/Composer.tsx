import { useRef } from "react";
import { ArrowUp } from "lucide-react";

const MAX_LENGTH = 4000;

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  caseId,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  caseId: string | null;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const nearLimit = value.length > MAX_LENGTH * 0.9;

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }

  return (
    <div className="border-t border-[var(--lr-border)] bg-[var(--lr-bg)]/85 px-4 pb-4 pt-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-2 shadow-[var(--shadow-sm,0_1px_2px_rgba(0,0,0,0.06))] focus-within:border-[var(--lr-accent)]">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => {
            onChange(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
              if (taRef.current) taRef.current.style.height = "auto";
            }
          }}
          placeholder={
            caseId
              ? `Ask about ${caseId}, or Indian law generally…`
              : "Ask a question about Indian law…"
          }
          className="min-h-[40px] max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-[var(--lr-text)] outline-none placeholder:text-[var(--lr-text-faint)]"
        />
        <button
          onClick={() => {
            onSend();
            if (taRef.current) taRef.current.style.height = "auto";
          }}
          disabled={disabled || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lr-brand)] text-[var(--lr-brand-contrast)] transition-transform active:scale-95 disabled:bg-[var(--lr-bg-subtle)] disabled:text-[var(--lr-text-faint)]"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      <div className="mx-auto flex max-w-3xl items-center justify-between px-1 pt-1.5">
        <p className="text-[10.5px] text-[var(--lr-text-faint)]">
          Answers are generated from indexed statutes and are not a
          substitute for legal advice.
        </p>
        {nearLimit && (
          <span
            className={`text-[10.5px] ${value.length >= MAX_LENGTH ? "text-[var(--lr-warning)]" : "text-[var(--lr-text-faint)]"}`}
          >
            {value.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
}
