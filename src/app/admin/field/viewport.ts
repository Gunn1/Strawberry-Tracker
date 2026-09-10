"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the sheets in this section decide to put themselves.
 *
 * Below this width everything rises from the bottom of the screen, because
 * that is where a thumb is. Above it a bottom sheet is a long way from
 * whatever you pressed, so menus sit in place and panels centre.
 */
export const WIDE_FROM = 700;

const QUERY = `(min-width: ${WIDE_FROM}px)`;

export function isWide(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Follows the width rather than sampling it once at mount. Rotating a phone
 * or dragging a window across the breakpoint used to leave an open sheet
 * stuck in the layout it was born with.
 */
export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // the server has no width; the client corrects on hydration
  );
}
