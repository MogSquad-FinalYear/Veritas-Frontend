import { useEffect, useRef, useState } from "react";

export type ConnState = "checking" | "online" | "degraded" | "offline";

/** Polls a backend's health endpoint on an interval and reports a simple
 * connection state, so the sidebar can show a live dot per service without
 * every page re-implementing its own polling loop. */
export function useHealth(
  check: () => Promise<ConnState>,
  intervalMs = 20000,
): ConnState {
  const [state, setState] = useState<ConnState>("checking");
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await checkRef.current();
        if (!cancelled) setState(result);
      } catch {
        if (!cancelled) setState("offline");
      }
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return state;
}
