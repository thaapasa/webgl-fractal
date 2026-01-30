/**
 * Fractal Engine - The orchestrator that ties everything together
 *
 * "The conductor of this symphony. Obviously."
 * - Skippy the Magnificent
 */

import { WebGLRenderer } from '../renderer/WebGLRenderer';
import { ShaderProgram } from '../renderer/ShaderProgram';
import { ViewState } from '../controls/ViewState';
import { InputHandler } from '../controls/InputHandler';
import { FractalType, FRACTAL_TYPE_NAMES } from '../types';
import {
  BookmarkState,
  readUrlBookmark,
  updateUrlHash,
  copyShareableUrl,
} from '../bookmark/BookmarkManager';
import { getLocationByKey } from '../bookmark/famousLocations';

// Import shader sources
import vertexShaderSource from '../renderer/shaders/mandelbrot.vert.glsl?raw';
import fragmentShaderSource from '../renderer/shaders/mandelbrot.frag.glsl?raw';
import aaPostFragmentSource from '../renderer/shaders/aa-post.frag.glsl?raw';

/** Base iterations at zoom 1; scaled up with log(zoom) for deeper zooms. */
const MAX_ITERATIONS_BASE = 256;
/** Higher base for Julia sets - they need more iterations to resolve fine detail. */
const MAX_ITERATIONS_BASE_JULIA = 512;
/** Default cap for auto-scaling; can be bypassed with manual override. */
const MAX_ITERATIONS_AUTO_CAP = 4096;
/** Steep power curve: ~256@z1, ~1200@z18, ~3100@z350, cap@z~1e3. */
const MAX_ITERATIONS_LOG_SCALE = 640;
const MAX_ITERATIONS_LOG_POWER = 1.65;
/** Ratio for manual iteration adjustments (+/- keys). */
const ITERATION_ADJUST_RATIO = 1.5;

function maxIterationsForZoom(zoom: number, isJulia: boolean = false): number {
  const z = Math.max(1, zoom);
  const L = Math.log10(z);
  const base = isJulia ? MAX_ITERATIONS_BASE_JULIA : MAX_ITERATIONS_BASE;
  const n =
    base +
    MAX_ITERATIONS_LOG_SCALE * Math.pow(L, MAX_ITERATIONS_LOG_POWER);
  return Math.round(
    Math.max(base, Math.min(MAX_ITERATIONS_AUTO_CAP, n))
  );
}

export class FractalEngine {
  private renderer: WebGLRenderer;
  private shaderProgram: ShaderProgram;
  private postProcessProgram: ShaderProgram;
  private viewState: ViewState;
  private inputHandler: InputHandler;

  /** When set, overrides zoom-based max iterations. */
  private maxIterationsOverride: number | null = null;

  /** Current fractal type. */
  private fractalType: FractalType = FractalType.Mandelbrot;
  /** Number of non-Julia fractal types (for cycling). Julia types are selected via picker. */
  private static readonly BASE_FRACTAL_TYPE_COUNT = 2; // Mandelbrot, Burning Ship

  /** Julia set constant (c in z = z² + c). */
  private juliaC: [number, number] = [-0.7, 0.27015]; // Classic Julia constant
  /** Whether Julia picker mode is active. */
  private juliaPickerMode = false;
  /** Saved view state before entering Julia mode. */
  private savedViewState: { centerX: number; centerY: number; zoom: number } | null = null;
  /** Saved fractal type before entering Julia mode. */
  private savedFractalType: FractalType | null = null;

  /** Color palette index (0-11). */
  private paletteIndex = 4; // Fire
  /** Color offset for shifting the color cycle. */
  private colorOffset = 0.0;
  /** Number of available palettes. */
  private static readonly PALETTE_COUNT = 12;
  /** Palette names for display. */
  private static readonly PALETTE_NAMES = [
    'Rainbow', 'Blue', 'Gold', 'Grayscale', 'Fire', 'Ice',
    'Sepia', 'Ocean', 'Purple', 'Forest', 'Sunset', 'Electric'
  ];

  /** Overlay showing zoom and iteration count (for debugging). */
  private debugOverlay: HTMLElement | null = null;

  /** Notification element for share confirmation. */
  private shareNotification: HTMLElement | null = null;

  /** Help overlay showing keyboard shortcuts. */
  private helpOverlay: HTMLElement | null = null;

  /** Whether help overlay is visible. */
  private helpVisible = false;

  /** Whether screenshot mode is active (hides all UI). */
  private screenshotMode = false;

  /** Whether post-process antialiasing is enabled. */
  private aaEnabled = false;

  /** Render-to-texture: FBO and texture for Mandelbrot pass. */
  private fbo: WebGLFramebuffer | null = null;
  private renderTarget: WebGLTexture | null = null;
  private rtWidth = 0;
  private rtHeight = 0;

  private quadBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize renderer
    this.renderer = new WebGLRenderer(canvas);

    // Initialize view state
    this.viewState = new ViewState();

    this.shaderProgram = new ShaderProgram(
      this.renderer.gl,
      vertexShaderSource,
      fragmentShaderSource
    );
    this.postProcessProgram = new ShaderProgram(
      this.renderer.gl,
      vertexShaderSource,
      aaPostFragmentSource
    );

    this.setupGeometry();
    this.setupRenderTarget();

    // Setup input handler
    this.inputHandler = new InputHandler(canvas, this.viewState, () => {
      // View state changed, trigger a render
      this.render();
    });

    // Wire up keyboard iteration controls
    this.inputHandler.setIterationAdjustCallback((direction) => {
      this.adjustMaxIterations(direction);
    });
    this.inputHandler.setIterationResetCallback(() => {
      this.clearMaxIterationsOverride();
    });

    // Wire up keyboard color controls
    this.inputHandler.setPaletteCycleCallback((direction) => {
      this.cyclePalette(direction);
    });
    this.inputHandler.setColorOffsetCallback((delta) => {
      this.adjustColorOffset(delta);
    });
    this.inputHandler.setColorOffsetResetCallback(() => {
      this.resetColorOffset();
    });

    // Wire up AA toggle
    this.inputHandler.setToggleAACallback(() => {
      this.toggleAA();
    });

    // Wire up fractal type toggle
    this.inputHandler.setFractalCycleCallback((direction) => {
      this.cycleFractalType(direction);
    });

    // Wire up Julia picker mode
    this.inputHandler.setToggleJuliaModeCallback(() => {
      this.toggleJuliaPickerMode();
    });
    this.inputHandler.setJuliaPickCallback((x, y) => {
      this.pickJuliaConstant(x, y);
    });

    // Debug overlay: zoom + iterations
    const parent = canvas.parentElement;
    if (parent) {
      this.debugOverlay = document.createElement('div');
      this.debugOverlay.id = 'zoom-debug';
      parent.appendChild(this.debugOverlay);

      // Share notification (hidden by default)
      this.shareNotification = document.createElement('div');
      this.shareNotification.id = 'share-notification';
      this.shareNotification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: #4ade80;
        padding: 16px 32px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 16px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      parent.appendChild(this.shareNotification);

      // Help overlay (hidden by default)
      this.helpOverlay = document.createElement('div');
      this.helpOverlay.id = 'help-overlay';
      this.helpOverlay.innerHTML = this.createHelpContent();
      this.helpOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.92);
        color: #e5e5e5;
        padding: 24px 32px;
        border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;
      parent.appendChild(this.helpOverlay);
    }

// Wire up share callback
    this.inputHandler.setShareCallback(() => {
      this.shareBookmark();
    });

    // Wire up location selection (number keys 1-9)
    this.inputHandler.setLocationSelectCallback((key) => {
      this.goToLocation(key);
    });

    // Wire up help and screenshot mode toggles
    this.inputHandler.setToggleHelpCallback(() => {
      this.toggleHelp();
    });
    this.inputHandler.setToggleScreenshotModeCallback(() => {
      this.toggleScreenshotMode();
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Listen for URL hash changes (for pasting new bookmark URLs)
    window.addEventListener('hashchange', this.handleHashChange);

    // Load bookmark from URL if present
    this.loadBookmark();

    // Initial resize
    this.handleResize();
  }

  private handleHashChange = (): void => {
    this.loadBookmark();
  };

  private handleResize = (): void => {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.ensureRenderTargetSize();
    this.render();
  };

  private setupGeometry(): void {
    const gl = this.renderer.gl;

    // Fullscreen quad: two triangles covering clip space
    // Positions are in UV space (0-1), shader maps to clip space
    const quadVertices = new Float32Array([
      // Triangle 1
      0.0, 0.0, // Bottom-left
      1.0, 0.0, // Bottom-right
      0.0, 1.0, // Top-left
      // Triangle 2
      1.0, 0.0, // Bottom-right
      1.0, 1.0, // Top-right
      0.0, 1.0, // Top-left
    ]);

    this.quadBuffer = gl.createBuffer();
    if (!this.quadBuffer) {
      throw new Error('Failed to create buffer');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  }


  private setupRenderTarget(): void {
    const gl = this.renderer.gl;
    this.fbo = gl.createFramebuffer();
    this.renderTarget = gl.createTexture();
  }

  private ensureRenderTargetSize(): void {
    const gl = this.renderer.gl;
    const w = this.renderer.canvas.width;
    const h = this.renderer.canvas.height;
    if (w < 1 || h < 1) return;
    if (w === this.rtWidth && h === this.rtHeight) return;
    this.rtWidth = w;
    this.rtHeight = h;

    gl.bindTexture(gl.TEXTURE_2D, this.renderTarget);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.renderTarget,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private render(): void {
    const gl = this.renderer.gl;
    const w = this.renderer.canvas.width;
    const h = this.renderer.canvas.height;
    const isJulia = this.fractalType === FractalType.Julia || this.fractalType === FractalType.BurningShipJulia;
    const maxIter =
      this.maxIterationsOverride ??
      maxIterationsForZoom(this.viewState.zoom, isJulia);

    if (this.debugOverlay) {
      const z = this.viewState.zoom;
      const zoomStr = z >= 1e6 ? z.toExponential(2) : z < 1 ? z.toPrecision(4) : String(Math.round(z));
      const iterSuffix = this.maxIterationsOverride !== null ? ' (manual)' : '';
      const paletteName = FractalEngine.PALETTE_NAMES[this.paletteIndex];
      const fractalName = FRACTAL_TYPE_NAMES[this.fractalType];
      const aaStatus = this.aaEnabled ? 'AA' : '';
      const juliaStatus = this.juliaPickerMode ? '🎯 Pick Julia point' : '';
      const juliaCoords = (this.fractalType === FractalType.Julia || this.fractalType === FractalType.BurningShipJulia)
        ? `c=(${this.juliaC[0].toFixed(4)}, ${this.juliaC[1].toFixed(4)})`
        : '';
      const colorOffsetStr = Math.abs(this.colorOffset) > 0.001 ? `offset ${this.colorOffset.toFixed(1)}` : '';
      const statusParts = [fractalName, `zoom ${zoomStr}`, `iterations ${maxIter}${iterSuffix}`, paletteName];
      if (colorOffsetStr) statusParts.push(colorOffsetStr);
      if (juliaCoords) statusParts.push(juliaCoords);
      if (aaStatus) statusParts.push(aaStatus);
      if (juliaStatus) statusParts.push(juliaStatus);
      statusParts.push('H = help');
      this.debugOverlay.textContent = statusParts.join('  ·  ');
    }

    // Pass 1: render Mandelbrot (to texture if AA enabled, directly to screen if not)
    if (this.aaEnabled) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, w, h);
    this.renderer.clear(0, 0, 0, 1);

    this.shaderProgram.use();
    this.shaderProgram.setUniform('u_resolution', [w, h]);
    this.shaderProgram.setUniform('u_center', [this.viewState.centerX, this.viewState.centerY]);
    this.shaderProgram.setUniform('u_zoom', this.viewState.zoom);
    this.shaderProgram.setUniformInt('u_maxIterations', maxIter);
    this.shaderProgram.setUniform('u_time', performance.now() * 0.001);
    this.shaderProgram.setUniformInt('u_paletteIndex', this.paletteIndex);
    this.shaderProgram.setUniform('u_colorOffset', this.colorOffset);
    this.shaderProgram.setUniformInt('u_fractalType', this.fractalType);
    this.shaderProgram.setUniform('u_juliaC', this.juliaC);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation = 0;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: AA post-process to screen (only if AA enabled)
    if (this.aaEnabled) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      this.renderer.clear(0.05, 0.05, 0.1, 1);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.renderTarget);
      this.postProcessProgram.use();
      this.postProcessProgram.setUniformInt('u_tex', 0);
      this.postProcessProgram.setUniform('u_resolution', [w, h]);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  /**
   * Start the render loop
   */
  start(): void {
    this.renderer.start(() => {
      this.render();
    });
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.renderer.stop();
  }

  /**
   * Set maximum iterations (overrides zoom-based scaling).
   * No upper cap - go as high as your GPU can handle!
   */
  setMaxIterations(iterations: number): void {
    this.maxIterationsOverride = Math.round(Math.max(1, iterations));
    this.render();
  }

  /**
   * Adjust max iterations by a ratio. Positive direction = more iterations.
   * @param direction 1 for increase, -1 for decrease
   */
  adjustMaxIterations(direction: 1 | -1): void {
    const isJulia = this.fractalType === FractalType.Julia || this.fractalType === FractalType.BurningShipJulia;
    const currentIter =
      this.maxIterationsOverride ?? maxIterationsForZoom(this.viewState.zoom, isJulia);
    const newIter =
      direction > 0
        ? currentIter * ITERATION_ADJUST_RATIO
        : currentIter / ITERATION_ADJUST_RATIO;
    this.setMaxIterations(newIter);
  }

  /**
   * Clear the manual override and return to zoom-based auto-scaling.
   */
  clearMaxIterationsOverride(): void {
    this.maxIterationsOverride = null;
    this.render();
  }

  /**
   * Toggle antialiasing post-process on/off.
   */
  toggleAA(): void {
    this.aaEnabled = !this.aaEnabled;
    this.render();
  }

  /**
   * Cycle to the next fractal type (Mandelbrot/Burning Ship only).
   * Julia variants are accessed via the Julia picker mode.
   * @param direction 1 for next, -1 for previous
   */
  cycleFractalType(direction: 1 | -1 = 1): void {
    // If we're in a Julia variant, exit to the corresponding base type first
    if (this.fractalType === FractalType.Julia) {
      this.fractalType = FractalType.Mandelbrot;
    } else if (this.fractalType === FractalType.BurningShipJulia) {
      this.fractalType = FractalType.BurningShip;
    }

    // Cycle through base types only
    this.fractalType = (this.fractalType + direction + FractalEngine.BASE_FRACTAL_TYPE_COUNT) % FractalEngine.BASE_FRACTAL_TYPE_COUNT;

    // Exit picker mode when changing fractal type
    if (this.juliaPickerMode) {
      this.juliaPickerMode = false;
      this.inputHandler.setJuliaPickerMode(false);
    }

    this.render();
  }

  /**
   * Toggle Julia picker mode on/off.
   * When active, clicking on the fractal picks a Julia constant.
   * If already viewing a Julia set, pressing J returns to the source set.
   */
  toggleJuliaPickerMode(): void {
    // If currently viewing a Julia set, return to the saved state
    if (this.fractalType === FractalType.Julia || this.fractalType === FractalType.BurningShipJulia) {
      this.exitJuliaMode();
      return;
    }

    // Toggle picker mode
    this.juliaPickerMode = !this.juliaPickerMode;
    this.inputHandler.setJuliaPickerMode(this.juliaPickerMode);
    this.render();
  }

  /**
   * Pick a Julia constant from the current fractal view.
   * @param x Real component of the point clicked
   * @param y Imaginary component of the point clicked
   */
  pickJuliaConstant(x: number, y: number): void {
    // Save current state before switching to Julia
    this.savedViewState = {
      centerX: this.viewState.centerX,
      centerY: this.viewState.centerY,
      zoom: this.viewState.zoom,
    };
    this.savedFractalType = this.fractalType;

    // Set the Julia constant
    this.juliaC = [x, y];

    // Switch to the appropriate Julia variant
    if (this.fractalType === FractalType.BurningShip) {
      this.fractalType = FractalType.BurningShipJulia;
    } else {
      this.fractalType = FractalType.Julia;
    }

    // Exit picker mode
    this.juliaPickerMode = false;
    this.inputHandler.setJuliaPickerMode(false);

    // Reset view for the Julia set
    this.viewState.centerX = 0;
    this.viewState.centerY = 0;
    this.viewState.zoom = 0.8;

    this.render();
  }

  /**
   * Exit Julia mode and return to the source fractal.
   */
  private exitJuliaMode(): void {
    // Determine the base fractal type from the current Julia variant
    const baseType = this.fractalType === FractalType.BurningShipJulia
      ? FractalType.BurningShip
      : FractalType.Mandelbrot;

    // Restore saved state if available
    if (this.savedViewState) {
      this.viewState.centerX = this.savedViewState.centerX;
      this.viewState.centerY = this.savedViewState.centerY;
      this.viewState.zoom = this.savedViewState.zoom;
      this.savedViewState = null;
    } else {
      // Default reset - use appropriate center for the base type
      this.viewState.centerX = baseType === FractalType.BurningShip ? -0.5 : -0.5;
      this.viewState.centerY = baseType === FractalType.BurningShip ? -0.5 : 0;
      this.viewState.zoom = 0.4;
    }

    // Restore fractal type
    if (this.savedFractalType !== null) {
      this.fractalType = this.savedFractalType;
      this.savedFractalType = null;
    } else {
      // Default to the appropriate base type
      this.fractalType = baseType;
    }

    this.render();
  }

  /**
   * Set the Julia constant directly.
   * @param real Real component
   * @param imag Imaginary component
   */
  setJuliaConstant(real: number, imag: number): void {
    this.juliaC = [real, imag];
    this.render();
  }

  /**
   * Cycle to the next color palette.
   * @param direction 1 for next, -1 for previous
   */
  cyclePalette(direction: 1 | -1 = 1): void {
    this.paletteIndex = (this.paletteIndex + direction + FractalEngine.PALETTE_COUNT) % FractalEngine.PALETTE_COUNT;
    this.render();
  }

  /**
   * Adjust the color offset to shift the color cycle.
   * @param delta Amount to shift (positive = forward, negative = backward)
   */
  adjustColorOffset(delta: number): void {
    this.colorOffset += delta;
    this.render();
  }

  /**
   * Reset color offset to zero.
   */
  resetColorOffset(): void {
    this.colorOffset = 0.0;
    this.render();
  }

  /**
   * Reset view to initial position
   */
  resetView(): void {
    this.viewState.reset();
    this.render();
  }

  /**
   * Get the current state as a BookmarkState object
   */
  getBookmarkState(): BookmarkState {
    return {
      fractalType: this.fractalType,
      centerX: this.viewState.centerX,
      centerY: this.viewState.centerY,
      zoom: this.viewState.zoom,
      paletteIndex: this.paletteIndex,
      colorOffset: this.colorOffset,
      juliaC: this.juliaC,
      maxIterationsOverride: this.maxIterationsOverride,
      aaEnabled: this.aaEnabled,
    };
  }

  /**
   * Apply a partial bookmark state to the engine
   */
  applyBookmarkState(state: Partial<BookmarkState>): void {
    if (state.fractalType !== undefined) {
      this.fractalType = state.fractalType;
    }
    if (state.centerX !== undefined) {
      this.viewState.centerX = state.centerX;
    }
    if (state.centerY !== undefined) {
      this.viewState.centerY = state.centerY;
    }
    if (state.zoom !== undefined) {
      this.viewState.zoom = state.zoom;
    }
    if (state.paletteIndex !== undefined) {
      this.paletteIndex = state.paletteIndex;
    }
    if (state.colorOffset !== undefined) {
      this.colorOffset = state.colorOffset;
    }
    if (state.juliaC !== undefined) {
      this.juliaC = state.juliaC;
    }
    if (state.maxIterationsOverride !== undefined) {
      this.maxIterationsOverride = state.maxIterationsOverride;
    }
    if (state.aaEnabled !== undefined) {
      this.aaEnabled = state.aaEnabled;
    }
    this.render();
  }

  /**
   * Load bookmark state from URL hash (if present)
   */
  private loadBookmark(): void {
    const state = readUrlBookmark();
    if (Object.keys(state).length > 0) {
      this.applyBookmarkState(state);
      console.log('Loaded fractal state from URL');
    }
  }

  /**
   * Update URL hash with current state (without page reload)
   */
  updateUrlBookmark(): void {
    updateUrlHash(this.getBookmarkState());
  }

  /**
   * Navigate to a famous location by keyboard key (1-9)
   */
  goToLocation(key: string): void {
    const location = getLocationByKey(key);
    if (location) {
      this.applyBookmarkState(location.state);
      this.updateUrlBookmark();
      this.showLocationNotification(location.name);
    }
  }

  /**
   * Show notification when navigating to a famous location
   */
  private showLocationNotification(name: string): void {
    if (!this.shareNotification) return;

    this.shareNotification.textContent = `📍 ${name}`;
    this.shareNotification.style.color = '#60a5fa';
    this.shareNotification.style.opacity = '1';

    setTimeout(() => {
      if (this.shareNotification) {
        this.shareNotification.style.opacity = '0';
      }
    }, 1500);
  }

  /**
   * Copy shareable URL to clipboard and show notification
   */
  async shareBookmark(): Promise<void> {
    const success = await copyShareableUrl(this.getBookmarkState());
    this.showShareNotification(success);
    if (success) {
      // Also update the URL bar
      this.updateUrlBookmark();
    }
  }

  /**
   * Show the share notification briefly
   */
  private showShareNotification(success: boolean): void {
    if (!this.shareNotification) return;

    this.shareNotification.textContent = success
      ? '📋 Link copied to clipboard!'
      : '❌ Failed to copy link';
    this.shareNotification.style.color = success ? '#4ade80' : '#f87171';
    this.shareNotification.style.opacity = '1';

    setTimeout(() => {
      if (this.shareNotification) {
        this.shareNotification.style.opacity = '0';
      }
    }, 2000);
  }

  /**
   * Toggle help overlay visibility.
   */
  toggleHelp(): void {
    this.helpVisible = !this.helpVisible;
    if (this.helpOverlay) {
      this.helpOverlay.style.opacity = this.helpVisible ? '1' : '0';
      this.helpOverlay.style.pointerEvents = this.helpVisible ? 'auto' : 'none';
    }
  }

  /**
   * Toggle screenshot mode (hides all UI overlays).
   */
  toggleScreenshotMode(): void {
    this.screenshotMode = !this.screenshotMode;

    // Hide help if screenshot mode is activated
    if (this.screenshotMode && this.helpVisible) {
      this.helpVisible = false;
      if (this.helpOverlay) {
        this.helpOverlay.style.opacity = '0';
        this.helpOverlay.style.pointerEvents = 'none';
      }
    }

    // Toggle debug overlay visibility
    if (this.debugOverlay) {
      this.debugOverlay.style.display = this.screenshotMode ? 'none' : 'block';
    }

    // Show brief notification when entering/exiting screenshot mode
    if (this.shareNotification) {
      this.shareNotification.textContent = this.screenshotMode
        ? '📷 Screenshot mode (Space to exit)'
        : '📷 UI restored';
      this.shareNotification.style.color = '#60a5fa';
      this.shareNotification.style.opacity = '1';
      setTimeout(() => {
        if (this.shareNotification) {
          this.shareNotification.style.opacity = '0';
        }
      }, 1000);
    }
  }

  /**
   * Generate HTML content for the help overlay.
   */
  private createHelpContent(): string {
    return `
      <h2 style="margin: 0 0 16px 0; color: #60a5fa; font-size: 20px; font-weight: 600;">
        🌀 Fractal Explorer - Keyboard Shortcuts
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 32px;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Navigation</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('Drag', 'Pan view')}
            ${this.helpRow('Scroll', 'Zoom in/out')}
            ${this.helpRow('Double-click', 'Zoom in at point')}
            ${this.helpRow('1-9', 'Famous locations')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Iterations</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('+/-', 'Adjust iterations')}
            ${this.helpRow('0', 'Reset to auto')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Colors</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('C / Shift+C', 'Cycle palettes')}
            ${this.helpRow(', / .', 'Shift colors (fine)')}
            ${this.helpRow('< / >', 'Shift colors (coarse)')}
            ${this.helpRow('R', 'Reset color offset')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Fractal Type</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('F / Shift+F', 'Cycle fractals')}
            ${this.helpRow('J', 'Julia picker mode')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Display</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('A', 'Toggle antialiasing')}
            ${this.helpRow('H', 'Toggle this help')}
            ${this.helpRow('Space', 'Screenshot mode')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Share</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('S', 'Copy bookmark URL')}
          </div>
        </div>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 12px; text-align: center;">
        Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: inherit;">H</kbd> to close
      </div>
    `;
  }

  /**
   * Helper to generate a help row.
   */
  private helpRow(key: string, description: string): string {
    return `
      <div style="display: flex; align-items: baseline; gap: 8px;">
        <kbd style="background: rgba(255,255,255,0.1); color: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; min-width: 60px; text-align: center;">${key}</kbd>
        <span style="color: #ccc;">${description}</span>
      </div>
    `;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('hashchange', this.handleHashChange);
    this.debugOverlay?.remove();
    this.debugOverlay = null;
    this.shareNotification?.remove();
    this.shareNotification = null;
    this.helpOverlay?.remove();
    this.helpOverlay = null;
    this.inputHandler.destroy();
    this.shaderProgram.destroy();
    this.postProcessProgram.destroy();
    const gl = this.renderer.gl;
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    if (this.renderTarget) gl.deleteTexture(this.renderTarget);
    this.renderer.destroy();
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
  }
}
