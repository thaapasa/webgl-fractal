/**
 * Color Palettes - Defined in TypeScript, passed to GPU as parameters
 *
 * "Colors managed properly, not scattered across shader code like confetti."
 * - Skippy the Magnificent
 */

export type Vec3 = [number, number, number];

export interface CosinePaletteParams {
  type: 'cosine';
  // color = a + b * cos(2π * (c * t + d))
  a: Vec3;
  b: Vec3;
  c: Vec3;
  d: Vec3;
}

export interface GradientPaletteParams {
  type: 'gradient';
  // 5 color stops
  c1: Vec3;
  c2: Vec3;
  c3: Vec3;
  c4: Vec3;
  c5: Vec3;
}

export type PaletteParams = CosinePaletteParams | GradientPaletteParams;

export interface Palette {
  name: string;
  isMonotonic: boolean;
  params: PaletteParams;
  // Optional HDR-specific params (for monotonic palettes that need brighter colors)
  hdrParams?: GradientPaletteParams;
}

// ============================================
// Cosine Palettes
// color = a + b * cos(2π * (c * t + d))
// These work the same for SDR/HDR
// ============================================

interface CosinePalette extends Palette {
  params: CosinePaletteParams;
}

const COSINE_PALETTES: CosinePalette[] = [
  {
    name: 'Rainbow',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.33, 0.67],
    },
  },
  {
    name: 'Fire',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 0.5],
      d: [0.0, 0.1, 0.2],
    },
  },
  {
    name: 'Ice',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 0.7, 0.4],
      d: [0.0, 0.15, 0.20],
    },
  },
  {
    name: 'Sunset',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.3, 0.2],
      b: [0.5, 0.4, 0.3],
      c: [1.0, 1.0, 0.5],
      d: [0.0, 0.1, 0.2],
    },
  },
  {
    name: 'Electric',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.6, 0.6, 0.6],
      c: [1.0, 1.0, 1.0],
      d: [0.3, 0.2, 0.2],
    },
  },
  {
    name: 'Neon',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.1, 0.2],
    },
  },
  {
    name: 'Emerald',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.2, 0.5, 0.3],
      b: [0.3, 0.5, 0.3],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.25, 0.5],
    },
  },
  {
    name: 'Candy',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.8, 0.5, 0.5],
      b: [0.2, 0.4, 0.4],
      c: [1.0, 1.0, 2.0],
      d: [0.0, 0.25, 0.25],
    },
  },
  {
    name: 'Plasma',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [2.0, 1.0, 0.0],
      d: [0.5, 0.2, 0.25],
    },
  },
  {
    name: 'Peacock',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.3, 0.5, 0.5],
      b: [0.4, 0.4, 0.3],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.1, 0.35],
    },
  },
  {
    name: 'Autumn',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.6, 0.4, 0.2],
      b: [0.4, 0.3, 0.2],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.05, 0.1],
    },
  },
  {
    name: 'Aurora',
    isMonotonic: false,
    params: {
      type: 'cosine',
      a: [0.3, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 0.5],
      d: [0.8, 0.9, 0.3],
    },
  },
];

// ============================================
// Gradient Palettes
// 5 color stops with linear interpolation
// Can have HDR overrides for brighter base colors
// ============================================

interface GradientPalette extends Palette {
  params: GradientPaletteParams;
  hdrParams?: GradientPaletteParams;
}

const GRADIENT_PALETTES: GradientPalette[] = [
  {
    name: 'Blue',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.02, 0.01, 0.08],
      c2: [0.05, 0.15, 0.25],
      c3: [0.1, 0.4, 0.5],
      c4: [0.3, 0.6, 0.8],
      c5: [0.7, 0.9, 1.0],
    },
    hdrParams: {
      type: 'gradient',
      c1: [0.2, 0.4, 1.0],
      c2: [0.3, 0.6, 1.0],
      c3: [0.4, 0.8, 1.0],
      c4: [0.6, 0.9, 1.0],
      c5: [0.85, 1.0, 1.0],
    },
  },
  {
    name: 'Gold',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.04, 0.02, 0.01],
      c2: [0.2, 0.08, 0.02],
      c3: [0.5, 0.25, 0.05],
      c4: [0.85, 0.6, 0.2],
      c5: [1.0, 0.95, 0.7],
    },
    hdrParams: {
      type: 'gradient',
      c1: [1.0, 0.5, 0.1],
      c2: [1.0, 0.65, 0.2],
      c3: [1.0, 0.8, 0.3],
      c4: [1.0, 0.9, 0.5],
      c5: [1.0, 1.0, 0.8],
    },
  },
  {
    name: 'Grayscale',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.01, 0.01, 0.03],
      c2: [0.15, 0.15, 0.17],
      c3: [0.45, 0.45, 0.45],
      c4: [0.75, 0.74, 0.72],
      c5: [1.0, 0.98, 0.95],
    },
    hdrParams: {
      type: 'gradient',
      c1: [1.0, 1.0, 1.0],
      c2: [1.0, 1.0, 1.0],
      c3: [1.0, 1.0, 1.0],
      c4: [1.0, 1.0, 1.0],
      c5: [1.0, 1.0, 1.0],
    },
  },
  {
    name: 'Sepia',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.03, 0.02, 0.01],
      c2: [0.15, 0.08, 0.03],
      c3: [0.4, 0.25, 0.12],
      c4: [0.7, 0.55, 0.35],
      c5: [1.0, 0.95, 0.85],
    },
    hdrParams: {
      type: 'gradient',
      c1: [1.0, 0.7, 0.4],
      c2: [1.0, 0.8, 0.55],
      c3: [1.0, 0.88, 0.7],
      c4: [1.0, 0.95, 0.85],
      c5: [1.0, 1.0, 0.95],
    },
  },
  {
    name: 'Ocean',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.0, 0.02, 0.05],
      c2: [0.02, 0.08, 0.2],
      c3: [0.05, 0.3, 0.4],
      c4: [0.2, 0.6, 0.6],
      c5: [0.6, 0.95, 0.9],
    },
    hdrParams: {
      type: 'gradient',
      c1: [0.1, 0.8, 0.8],
      c2: [0.2, 0.9, 0.85],
      c3: [0.4, 0.95, 0.9],
      c4: [0.65, 1.0, 0.95],
      c5: [0.85, 1.0, 1.0],
    },
  },
  {
    name: 'Purple',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.03, 0.01, 0.06],
      c2: [0.15, 0.05, 0.25],
      c3: [0.4, 0.15, 0.5],
      c4: [0.7, 0.4, 0.75],
      c5: [0.95, 0.8, 1.0],
    },
    hdrParams: {
      type: 'gradient',
      c1: [0.8, 0.2, 1.0],
      c2: [0.85, 0.4, 1.0],
      c3: [0.9, 0.6, 1.0],
      c4: [0.95, 0.8, 1.0],
      c5: [1.0, 0.95, 1.0],
    },
  },
  {
    name: 'Forest',
    isMonotonic: true,
    params: {
      type: 'gradient',
      c1: [0.02, 0.03, 0.01],
      c2: [0.05, 0.12, 0.04],
      c3: [0.1, 0.35, 0.15],
      c4: [0.3, 0.65, 0.3],
      c5: [0.7, 0.95, 0.6],
    },
    hdrParams: {
      type: 'gradient',
      c1: [0.3, 1.0, 0.2],
      c2: [0.5, 1.0, 0.4],
      c3: [0.7, 1.0, 0.55],
      c4: [0.85, 1.0, 0.75],
      c5: [0.95, 1.0, 0.9],
    },
  },
];

export const COSINE_PALETTE_COUNT = COSINE_PALETTES.length;
export const GRADIENT_PALETTE_COUNT = GRADIENT_PALETTES.length;

export type PaletteType = 'cosine' | 'gradient';

/**
 * Get cosine palette parameters for rendering
 */
export function getCosinePaletteParams(index: number): CosinePaletteParams {
  return COSINE_PALETTES[index % COSINE_PALETTE_COUNT].params;
}

/**
 * Get gradient palette parameters for rendering
 * @param hdr Whether to use HDR-specific params (if available)
 */
export function getGradientPaletteParams(index: number, hdr: boolean): GradientPaletteParams {
  const palette = GRADIENT_PALETTES[index % GRADIENT_PALETTE_COUNT];
  if (hdr && palette.hdrParams) {
    return palette.hdrParams;
  }
  return palette.params;
}

/**
 * Get full cosine palette info
 */
export function getCosinePalette(index: number): CosinePalette {
  return COSINE_PALETTES[index % COSINE_PALETTE_COUNT];
}

/**
 * Get full gradient palette info
 */
export function getGradientPalette(index: number): GradientPalette {
  return GRADIENT_PALETTES[index % GRADIENT_PALETTE_COUNT];
}

export function getCosinePaletteName(index: number): string {
  return COSINE_PALETTES[index % COSINE_PALETTE_COUNT].name;
}

export function getGradientPaletteName(index: number): string {
  return GRADIENT_PALETTES[index % GRADIENT_PALETTE_COUNT].name;
}

