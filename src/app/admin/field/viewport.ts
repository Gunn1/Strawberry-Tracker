/**
 * Where the sheets in this section decide to put themselves.
 *
 * Below this width everything rises from the bottom of the screen, because
 * that is where a thumb is. Above it a bottom sheet is a long way from
 * whatever you pressed, so menus hang off their button and panels centre.
 */
export const WIDE_FROM = 700;

export function isWide(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= WIDE_FROM;
}
