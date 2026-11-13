import { useRef } from "react";
import { ArrowUp, ImageIcon, Paperclip, X } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  refImage,
  refImageUrl,
  onAttachImage,
  onClearImage,
  dragging,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  refImage: File | null;
  refImageUrl: string | null;
  onAttachImage: () => void;
  onClearImage: () => void;
  dragging: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }

  function submit() {
    onSend();
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div className="border-t border-[var(--lr-border)] bg-[var(--lr-bg)] px-4 pb-4 pt-3">
      {dragging && (
        <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-dashed border-[var(--lr-accent)] bg-[var(--lr-accent-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--lr-accent)]">
          Drop an image to search visually
        </div>
      )}
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-within:border-[var(--lr-accent)]">
        {refImageUrl && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg-subtle)] p-1.5 pr-2">
            <img src={refImageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--lr-text-faint)]">
                <ImageIcon className="h-3 w-3" />
                Reference image
              </p>
              <p className="truncate text-xs text-[var(--lr-text)]">{refImage?.name}</p>
            </div>
            <button
              onClick={onClearImage}
              title="Remove image"
              className="shrink-0 rounded p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg)] hover:text-[var(--lr-text-muted)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={onAttachImage}
            disabled={disabled}
            title="Attach reference image"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)] disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="min-h-[40px] max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] text-[var(--lr-text)] outline-none placeholder:text-[var(--lr-text-faint)]"
          />
          <button
            onClick={submit}
            disabled={disabled || (!value.trim() && !refImage)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lr-brand)] text-[var(--lr-brand-contrast)] transition-transform active:scale-95 disabled:bg-[var(--lr-bg-subtle)] disabled:text-[var(--lr-text-faint)]"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-3xl px-1 pt-1.5 text-[10.5px] text-[var(--lr-text-faint)]">
        Enter to send · Shift+Enter for a new line · attach or drop an image to
        search visually
      </p>
    </div>
  );
}
