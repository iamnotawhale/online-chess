export const BOARD_COLUMN_MAX = 560;
export const BOARD_DESKTOP_MAX = 800;
export const MOBILE_BREAKPOINT = 768;

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}

/** Puzzle / training column — full viewport width on mobile. */
export function resolveBoardColumnWidth(containerWidth: number): number {
  if (isMobileViewport()) {
    return resolveGameBoardWidth(containerWidth);
  }
  if (containerWidth <= 0) {
    return BOARD_COLUMN_MAX;
  }
  return Math.max(280, Math.min(BOARD_COLUMN_MAX, containerWidth));
}

/** Live game & analysis — wider cap on desktop, full bleed on mobile. */
export function resolveGameBoardWidth(containerWidth?: number): number {
  if (isMobileViewport()) {
    const viewport = typeof window !== 'undefined' ? window.innerWidth : 320;
    return Math.max(280, viewport);
  }

  const fallback = typeof window !== 'undefined' ? window.innerWidth - 40 : BOARD_DESKTOP_MAX;
  const width = containerWidth && containerWidth > 0 ? containerWidth : fallback;
  return Math.max(280, Math.min(BOARD_DESKTOP_MAX, width));
}
