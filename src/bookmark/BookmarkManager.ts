/**
 * Bookmark Manager - URL-based state sharing
 *
 * "Sharing fractals with the masses. How quaint."
 * - Skippy the Magnificent
 */

import { FractalType } from '../types';

/**
 * Complete fractal state that can be bookmarked
 */
export interface BookmarkState {
  fractalType: FractalType;
  centerX: number;
  centerY: number;
  zoom: number;
  paletteIndex: number;
  colorOffset: number;
  juliaC: [number, number];
  maxIterationsOverride: number | null;
  aaEnabled: boolean;
}

/**
 * URL parameter names (kept short for compact URLs)
 * t = type, x = centerX, y = centerY, z = zoom
 * p = palette, o = color offset
 * jr = julia real, ji = julia imaginary
 * i = iterations, aa = antialiasing
 */
const PARAM = {
  TYPE: 't',
  CENTER_X: 'x',
  CENTER_Y: 'y',
  ZOOM: 'z',
  PALETTE: 'p',
  COLOR_OFFSET: 'o',
  JULIA_REAL: 'jr',
  JULIA_IMAG: 'ji',
  ITERATIONS: 'i',
  AA: 'aa',
} as const;

/**
 * Encode a number with reasonable precision for URLs.
 * Uses exponential notation for very large/small numbers.
 */
function encodeNumber(n: number, precision: number = 15): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 1e-10 || Math.abs(n) > 1e10) {
    return n.toExponential(precision);
  }
  // Trim trailing zeros
  return parseFloat(n.toPrecision(precision)).toString();
}

/**
 * Decode a number from URL string
 */
function decodeNumber(s: string | null): number | null {
  if (s === null || s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Encode fractal state into URL hash parameters
 */
export function encodeBookmark(state: BookmarkState): string {
  const params = new URLSearchParams();

  params.set(PARAM.TYPE, state.fractalType.toString());
  params.set(PARAM.CENTER_X, encodeNumber(state.centerX));
  params.set(PARAM.CENTER_Y, encodeNumber(state.centerY));
  params.set(PARAM.ZOOM, encodeNumber(state.zoom));
  params.set(PARAM.PALETTE, state.paletteIndex.toString());

  // Only include optional params if they have non-default values
  if (Math.abs(state.colorOffset) > 0.001) {
    params.set(PARAM.COLOR_OFFSET, encodeNumber(state.colorOffset, 4));
  }

  // Include Julia constant for Julia-type fractals
  if (state.fractalType === FractalType.Julia || state.fractalType === FractalType.BurningShipJulia) {
    params.set(PARAM.JULIA_REAL, encodeNumber(state.juliaC[0]));
    params.set(PARAM.JULIA_IMAG, encodeNumber(state.juliaC[1]));
  }

  if (state.maxIterationsOverride !== null) {
    params.set(PARAM.ITERATIONS, state.maxIterationsOverride.toString());
  }

  if (state.aaEnabled) {
    params.set(PARAM.AA, '1');
  }

  return params.toString();
}

/**
 * Decode bookmark state from URL hash parameters.
 * Returns partial state - only includes values that were present in the URL.
 */
export function decodeBookmark(hash: string): Partial<BookmarkState> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const state: Partial<BookmarkState> = {};

  const type = decodeNumber(params.get(PARAM.TYPE));
  if (type !== null && type >= 0 && type <= 3) {
    state.fractalType = type as FractalType;
  }

  const x = decodeNumber(params.get(PARAM.CENTER_X));
  if (x !== null) state.centerX = x;

  const y = decodeNumber(params.get(PARAM.CENTER_Y));
  if (y !== null) state.centerY = y;

  const z = decodeNumber(params.get(PARAM.ZOOM));
  if (z !== null && z > 0) state.zoom = z;

  const p = decodeNumber(params.get(PARAM.PALETTE));
  if (p !== null && p >= 0 && p <= 11) state.paletteIndex = Math.floor(p);

  const o = decodeNumber(params.get(PARAM.COLOR_OFFSET));
  if (o !== null) state.colorOffset = o;

  const jr = decodeNumber(params.get(PARAM.JULIA_REAL));
  const ji = decodeNumber(params.get(PARAM.JULIA_IMAG));
  if (jr !== null && ji !== null) {
    state.juliaC = [jr, ji];
  }

  const i = decodeNumber(params.get(PARAM.ITERATIONS));
  if (i !== null && i > 0) state.maxIterationsOverride = Math.floor(i);

  if (params.get(PARAM.AA) === '1') {
    state.aaEnabled = true;
  }

  return state;
}

/**
 * Get the full shareable URL for the current state
 */
export function getShareableUrl(state: BookmarkState): string {
  const hash = encodeBookmark(state);
  const url = new URL(window.location.href);
  url.hash = hash;
  return url.toString();
}

/**
 * Update the browser URL hash without triggering navigation
 */
export function updateUrlHash(state: BookmarkState): void {
  const hash = encodeBookmark(state);
  // Use replaceState to avoid cluttering browser history
  window.history.replaceState(null, '', '#' + hash);
}

/**
 * Read bookmark state from current URL
 */
export function readUrlBookmark(): Partial<BookmarkState> {
  return decodeBookmark(window.location.hash);
}

/**
 * Copy the shareable URL to clipboard
 * Returns true if successful
 */
export async function copyShareableUrl(state: BookmarkState): Promise<boolean> {
  const url = getShareableUrl(state);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
