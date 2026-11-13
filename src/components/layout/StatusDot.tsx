import type { ConnState } from "../../lib/useHealth";

const COLOR: Record<ConnState, string> = {
  checking: "bg-neutral-300",
  online: "bg-emerald-400",
  degraded: "bg-amber-400",
  offline: "bg-rose-400",
};

const LABEL: Record<ConnState, string> = {
  checking: "Checking…",
  online: "Online",
  degraded: "Loading",
  offline: "Offline",
};

export function StatusDot({ state }: { state: ConnState }) {
  return (
    <span className="relative flex h-2 w-2">
      {state === "online" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${COLOR[state]} opacity-60`}
        />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${COLOR[state]}`}
      />
      <span className="sr-only">{LABEL[state]}</span>
    </span>
  );
}

export { LABEL as statusLabel };
