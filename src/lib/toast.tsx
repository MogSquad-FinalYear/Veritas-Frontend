import { useCallback, useRef, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

export interface ToastItem {
  id: string;
  tone: "success" | "error";
  title: string;
  description?: string;
}

/** Small self-contained toast stack — enough to reproduce "upload
 * succeeded / failed" notifications without pulling in a toast library. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${++counter.current}`;
      setToasts((t) => [...t, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg ${
            t.tone === "success"
              ? "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-neutral-900"
              : "border-rose-200 bg-white dark:border-rose-500/30 dark:bg-neutral-900"
          }`}
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded p-0.5 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
