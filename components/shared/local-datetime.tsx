"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatDate } from "@/lib/format";

const subscribe = () => () => {};

/**
 * True only once hydrated in the browser. Server snapshot is always false,
 * so the server-rendered HTML and the client's first hydration pass agree
 * (no mismatch) — the real value then renders on the very next tick.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * Timestamps are stored in UTC and `formatDateTime`/`formatDate` read the
 * local wall-clock fields off a `Date`, so calling them from a Server
 * Component bakes in the *server's* timezone, not the viewer's — e.g. a
 * server running in UTC shows every time an hour behind a viewer in WAT.
 * Rendering here (client-only, after hydration) uses the browser's
 * timezone instead.
 */
export function LocalDateTime({ value, dateOnly = false }: { value: string; dateOnly?: boolean }) {
  const isHydrated = useIsHydrated();
  if (!isHydrated) return <>—</>;
  return <>{dateOnly ? formatDate(value) : formatDateTime(value)}</>;
}
