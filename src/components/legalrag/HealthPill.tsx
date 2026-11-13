import { useEffect, useRef, useState } from "react";
import * as api from "../../lib/api/legalrag";

/** Mirrors Nyaya's self-adjusting poll cadence: fast while the backend is
 * still loading models or unreachable, slow once it's actually ready — so
 * this doesn't hammer the endpoint once things are healthy. */
export function HealthPill({ base }: { base: string }) {
  const [health, setHealth] = useState<api.Health | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const h = await api.getHealth(baseRef.current);
        if (cancelled) return;
        setHealth(h);
        setUnreachable(false);
        timer = window.setTimeout(poll, h.status === "ready" ? 20000 : 2000);
      } catch {
        if (cancelled) return;
        setUnreachable(true);
        timer = window.setTimeout(poll, 4000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [base]);

  const status = unreachable ? "unreachable" : health?.status ?? "loading";
  const LABEL: Record<string, string> = {
    unreachable: "Backend unreachable",
    ready: "Backend ready",
    error: "Pipeline error",
    loading: "Loading models…",
  };
  const TONE: Record<string, string> = {
    unreachable: "bg-[var(--lr-danger)]",
    ready: "bg-[var(--lr-success)]",
    error: "bg-[var(--lr-danger)]",
    loading: "bg-[var(--lr-warning)]",
  };

  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-3 py-1 text-xs text-[var(--lr-text-muted)] sm:inline-flex"
      title={unreachable ? "Could not reach the API server" : health?.detail || ""}
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${TONE[status]} ${status === "loading" ? "lr-dot-pulse" : ""}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE[status]}`} />
      </span>
      {LABEL[status]}
    </span>
  );
}
