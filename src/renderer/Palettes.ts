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
// All Palettes
// Cosine palettes work the same for SDR/HDR
// Gradient palettes can have HDR overrides for brighter base colors
// ============================================

const PALETTES: Palette[] = [
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
];

export const PALETTE_COUNT = PALETTES.length;

/**
 * Get palette parameters for rendering
 * @param index Palette index
 * @param hdr Whether to use HDR-specific params (if available)
 */
export function getPaletteParams(index: number, hdr: boolean): PaletteParams {
  const palette = PALETTES[index % PALETTES.length];
  // Use HDR params if available and HDR is enabled
  if (hdr && palette.hdrParams) {
    return palette.hdrParams;
  }
  return palette.params;
}

/**
 * Get full palette info
 */
export function getPalette(index: number): Palette {
  return PALETTES[index % PALETTES.length];
}

export function getPaletteName(index: number): string {
  return PALETTES[index % PALETTES.length].name;
}

