/**
 * Famous Fractal Locations - Curated spots of mathematical beauty
 *
 * "The greatest hits of chaos theory. You're welcome."
 * - Skippy the Magnificent
 */

import { FractalType } from '../types';
import { BookmarkState } from './BookmarkManager';

export interface FamousLocation {
  name: string;
  description: string;
  key: string; // Keyboard shortcut (1-9)
  state: BookmarkState;
}

/**
 * Famous locations in the Mandelbrot set and related fractals.
 * Navigate using number keys 1-9.
 */
export const FAMOUS_LOCATIONS: FamousLocation[] = [
  // === MANDELBROT SET ===
  {
    name: 'Seahorse Valley',
    description: 'The iconic seahorse-shaped spirals in the Mandelbrot set',
    key: '1',
    state: {
      fractalType: FractalType.Mandelbrot,
      centerX: -0.747,
      centerY: 0.1,
      zoom: 70,
      paletteIndex: 4, // Fire
      colorOffset: 0.1,
      juliaC: [-0.7, 0.27015],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
  {
    name: 'Elephant Valley',
    description: 'Elephant trunk-like spirals on the positive real side',
    key: '2',
    state: {
      fractalType: FractalType.Mandelbrot,
      centerX: 0.273897508880652,
      centerY: 0.00596002252770864,
      zoom: 180,
      paletteIndex: 10, // Sunset
      colorOffset: -0.1,
      juliaC: [0.273897508880652, 0.00596002252770864],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
  {
    name: 'Double Spiral Valley',
    description: 'Beautiful double spirals deep in the set',
    key: '3',
    state: {
      fractalType: FractalType.Mandelbrot,
      centerX: -0.743733589978665,
      centerY: 0.130905227502858,
      zoom: 350,
      paletteIndex: 11,
      colorOffset: 0.2,
      juliaC: [-0.7, 0.27015],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
  {
    name: 'Spiral Galaxy',
    description: 'Galactic spiral arms emerging from chaos',
    key: '4',
    state: {
      fractalType: FractalType.Mandelbrot,
      centerX: -0.761542947469557,
      centerY: -0.0848063048239542,
      zoom: 1300,
      paletteIndex: 5,
      colorOffset: -0.6,
      juliaC: [-0.7, 0.27015],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },

  // === BURNING SHIP ===
  {
    name: 'The Armada',
    description: 'Mini ships along the antenna of the Burning Ship fractal',
    key: '5',
    state: {
      fractalType: FractalType.BurningShip,
      centerX: -1.80173025652805,
      centerY: 0.0153452534367207,
      zoom: 9,
      paletteIndex: 11, // Electric
      colorOffset: 0.2,
      juliaC: [-0.7, 0.27015],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },

  // === JULIA SETS ===
  {
    name: 'Douady Rabbit',
    description: 'The famous rabbit-eared Julia set',
    key: '6',
    state: {
      fractalType: FractalType.Julia,
      centerX: 0,
      centerY: 0,
      zoom: 0.6,
      paletteIndex: 11,
      colorOffset: 0.2,
      juliaC: [-0.123, 0.745],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
  {
    name: 'Dragon Julia',
    description: 'Fierce dragon-like Julia set',
    key: '7',
    state: {
      fractalType: FractalType.Julia,
      centerX: 0,
      centerY: 0,
      zoom: 0.45,
      paletteIndex: 10,
      colorOffset: 0.5,
      juliaC: [-0.8, 0.156],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
  {
    name: 'Lightning Julia',
    description: 'Electric, lightning-like patterns',
    key: '8',
    state: {
      fractalType: FractalType.Julia,
      centerX: 0,
      centerY: 0,
      zoom: 0.45,
      paletteIndex: 11, // Electric
      colorOffset: 0.2,
      juliaC: [-0.7269, 0.1889],
      maxIterationsOverride: 1000, // Needs more iterations to resolve fine filaments
      aaEnabled: false,
    },
  },

  // === BURNING SHIP JULIA ===
  {
    name: 'Burning Ship Julia',
    description: 'The Burning Ship transformed into Julia form',
    key: '9',
    state: {
      fractalType: FractalType.BurningShipJulia,
      centerX: 0.0531593112628493,
      centerY: -0.00735797965780141,
      zoom: 4,
      paletteIndex: 4,
      colorOffset: 0.1,
      juliaC: [-1.59537659751621, 0.00014862028243811],
      maxIterationsOverride: null,
      aaEnabled: false,
    },
  },
];

/**
 * Get a famous location by its keyboard shortcut
 */
export function getLocationByKey(key: string): FamousLocation | undefined {
  return FAMOUS_LOCATIONS.find(loc => loc.key === key);
}
