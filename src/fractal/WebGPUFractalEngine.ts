/**
 * WebGPU Fractal Engine - HDR-capable fractal renderer
 *
 * "WebGPU: Finally, graphics done right."
 * - Skippy the Magnificent
 */

import { WebGPURenderer } from '../renderer/WebGPURenderer';
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
import { getPalette, getPaletteParams, getPaletteName, PALETTE_COUNT } from '../renderer/Palettes';

import shaderSource from '../renderer/shaders/mandelbrot.wgsl?raw';

/** Base iterations at zoom 1 */
const MAX_ITERATIONS_BASE = 256;
const MAX_ITERATIONS_BASE_JULIA = 512;
const MAX_ITERATIONS_AUTO_CAP = 4096;
const MAX_ITERATIONS_LOG_SCALE = 640;
const MAX_ITERATIONS_LOG_POWER = 1.65;
const ITERATION_ADJUST_RATIO = 1.5;

function maxIterationsForZoom(zoom: number, isJulia: boolean = false): number {
  const z = Math.max(1, zoom);
  const L = Math.log10(z);
  const base = isJulia ? MAX_ITERATIONS_BASE_JULIA : MAX_ITERATIONS_BASE;
  const n = base + MAX_ITERATIONS_LOG_SCALE * Math.pow(L, MAX_ITERATIONS_LOG_POWER);
  return Math.round(Math.max(base, Math.min(MAX_ITERATIONS_AUTO_CAP, n)));
}

// Uniform buffer structure (must match WGSL)
// Base uniforms: 64 bytes
// Palette params: ~160 bytes (vec3s with padding)
// Total: 256 bytes (nice round number)
const UNIFORM_BUFFER_SIZE = 256;

export class WebGPUFractalEngine {
  private renderer: WebGPURenderer;
  private viewState: ViewState;
  private inputHandler: InputHandler;

  private pipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;

  private maxIterationsOverride: number | null = null;
  private fractalType: FractalType = FractalType.Mandelbrot;
  private juliaC: [number, number] = [-0.7, 0.27015];
  private juliaPickerMode = false;
  private savedViewState: { centerX: number; centerY: number; zoom: number } | null = null;
  private savedFractalType: FractalType | null = null;

  private paletteIndex = 4; // Fire
  private colorOffset = 0.0;

  /** HDR brightness bias: -1 to +1, shifts which regions appear bright */
  private hdrBrightnessBias = 0.0;

  private debugOverlay: HTMLElement | null = null;
  private shareNotification: HTMLElement | null = null;
  private helpOverlay: HTMLElement | null = null;
  private helpVisible = false;
  private screenshotMode = false;

  private constructor(renderer: WebGPURenderer, canvas: HTMLCanvasElement) {
    this.renderer = renderer;
    this.viewState = new ViewState();

    this.inputHandler = new InputHandler(canvas, this.viewState, () => {
      this.render();
    });

    this.setupInputCallbacks();
    this.setupOverlays(canvas);
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGPUFractalEngine> {
    const renderer = await WebGPURenderer.create(canvas);
    const engine = new WebGPUFractalEngine(renderer, canvas);
    await engine.initializePipeline();

    // Listen for HDR display changes
    renderer.setOnHdrChange(() => {
      console.log('HDR status changed, re-rendering...');
      engine.render();
    });

    window.addEventListener('resize', engine.handleResize);
    window.addEventListener('hashchange', engine.handleHashChange);

    engine.loadBookmark();
    engine.handleResize();

    return engine;
  }

  private async initializePipeline(): Promise<void> {
    const device = this.renderer.device;

    // Create shader module
    const shaderModule = device.createShaderModule({
      label: 'Mandelbrot Shader',
      code: shaderSource,
    });

    // Create uniform buffer
    this.uniformBuffer = device.createBuffer({
      label: 'Uniforms',
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Bind Group Layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    // Create bind group
    this.bindGroup = device.createBindGroup({
      label: 'Bind Group',
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    // Create render pipeline
    this.pipeline = device.createRenderPipeline({
      label: 'Mandelbrot Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.renderer.format,
        }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    console.log('WebGPU pipeline initialized');
  }

  private setupInputCallbacks(): void {
    this.inputHandler.setIterationAdjustCallback((direction) => {
      this.adjustMaxIterations(direction);
    });
    this.inputHandler.setIterationResetCallback(() => {
      this.clearMaxIterationsOverride();
    });
    this.inputHandler.setPaletteCycleCallback((direction) => {
      this.cyclePalette(direction);
    });
    this.inputHandler.setColorOffsetCallback((delta) => {
      this.adjustColorOffset(delta);
    });
    this.inputHandler.setColorOffsetResetCallback(() => {
      this.resetColorOffset();
    });
    this.inputHandler.setToggleAACallback(() => {
      // AA not supported in WebGPU version (HDR is always on)
      console.log('AA not available in WebGPU HDR mode');
    });
    this.inputHandler.setToggleHDRCallback(() => {
      this.toggleHDR();
    });
    this.inputHandler.setAdjustHdrBrightnessCallback((direction) => {
      this.adjustHdrBrightness(direction);
    });
    this.inputHandler.setResetHdrBrightnessCallback(() => {
      this.resetHdrBrightness();
    });
    this.inputHandler.setFractalCycleCallback((direction) => {
      this.cycleFractalType(direction);
    });
    this.inputHandler.setToggleJuliaModeCallback(() => {
      this.toggleJuliaPickerMode();
    });
    this.inputHandler.setJuliaPickCallback((x, y) => {
      this.pickJuliaConstant(x, y);
    });
    this.inputHandler.setShareCallback(() => {
      this.shareBookmark();
    });
    this.inputHandler.setLocationSelectCallback((key) => {
      this.goToLocation(key);
    });
    this.inputHandler.setToggleHelpCallback(() => {
      this.toggleHelp();
    });
    this.inputHandler.setToggleScreenshotModeCallback(() => {
      this.toggleScreenshotMode();
    });
  }

  private setupOverlays(canvas: HTMLCanvasElement): void {
    const parent = canvas.parentElement;
    if (!parent) return;

    this.debugOverlay = document.createElement('div');
    this.debugOverlay.id = 'zoom-debug';
    parent.appendChild(this.debugOverlay);

    this.shareNotification = document.createElement('div');
    this.shareNotification.id = 'share-notification';
    this.shareNotification.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85); color: #4ade80; padding: 16px 32px;
      border-radius: 8px; font-family: system-ui, sans-serif; font-size: 16px;
      z-index: 1000; opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
    `;
    parent.appendChild(this.shareNotification);

    this.helpOverlay = document.createElement('div');
    this.helpOverlay.id = 'help-overlay';
    this.helpOverlay.innerHTML = this.createHelpContent();
    this.helpOverlay.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.92); color: #e5e5e5; padding: 24px 32px;
      border-radius: 12px; font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px; z-index: 1001; opacity: 0; transition: opacity 0.2s ease;
      pointer-events: none; max-width: 90vw; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    parent.appendChild(this.helpOverlay);
  }

  private handleResize = (): void => {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.render();
  };

  private handleHashChange = (): void => {
    this.loadBookmark();
  };

  private render(): void {
    const device = this.renderer.device;
    const canvas = this.renderer.canvas;

    const isJulia = this.fractalType === FractalType.Julia ||
                    this.fractalType === FractalType.BurningShipJulia;
    const maxIter = this.maxIterationsOverride ??
                    maxIterationsForZoom(this.viewState.zoom, isJulia);

    // Update debug overlay
    if (this.debugOverlay && !this.screenshotMode) {
      const z = this.viewState.zoom;
      const zoomStr = z >= 1e6 ? z.toExponential(2) : z < 1 ? z.toPrecision(4) : String(Math.round(z));
      const iterSuffix = this.maxIterationsOverride !== null ? ' (manual)' : '';
      const paletteName = getPaletteName(this.paletteIndex);
      const fractalName = FRACTAL_TYPE_NAMES[this.fractalType];
      const hdrStatus = this.renderer.hdrEnabled
        ? (Math.abs(this.hdrBrightnessBias) > 0.01
            ? `HDR (${this.hdrBrightnessBias > 0 ? '+' : ''}${this.hdrBrightnessBias.toFixed(2)})`
            : 'HDR')
        : (this.renderer.displaySupportsHDR ? 'HDR available' : 'SDR');
      const juliaStatus = this.juliaPickerMode ? '🎯 Pick Julia point' : '';
      const juliaCoords = isJulia ? `c=(${this.juliaC[0].toFixed(4)}, ${this.juliaC[1].toFixed(4)})` : '';
      const colorOffsetStr = Math.abs(this.colorOffset) > 0.001 ? `offset ${this.colorOffset.toFixed(1)}` : '';

      const statusParts = [fractalName, `zoom ${zoomStr}`, `iterations ${maxIter}${iterSuffix}`, paletteName];
      if (colorOffsetStr) statusParts.push(colorOffsetStr);
      if (juliaCoords) statusParts.push(juliaCoords);
      statusParts.push(hdrStatus);
      if (juliaStatus) statusParts.push(juliaStatus);
      statusParts.push('H = help');
      this.debugOverlay.textContent = statusParts.join('  ·  ');
    }

    // Update uniforms
    const uniformData = new ArrayBuffer(UNIFORM_BUFFER_SIZE);
    const floatView = new Float32Array(uniformData);
    const intView = new Int32Array(uniformData);

    // Get current palette info and params
    const palette = getPalette(this.paletteIndex);
    const paletteParams = getPaletteParams(this.paletteIndex, this.renderer.hdrEnabled);

    // Pack base uniforms (must match WGSL struct layout with padding)
    floatView[0] = canvas.width;                    // resolution.x
    floatView[1] = canvas.height;                   // resolution.y
    floatView[2] = this.viewState.centerX;          // center.x
    floatView[3] = this.viewState.centerY;          // center.y
    floatView[4] = this.viewState.zoom;             // zoom
    intView[5] = maxIter;                           // maxIterations
    floatView[6] = performance.now() * 0.001;       // time
    floatView[7] = this.colorOffset;                // colorOffset
    intView[8] = this.fractalType;                  // fractalType
    // padding at 9
    floatView[10] = this.juliaC[0];                 // juliaC.x
    floatView[11] = this.juliaC[1];                 // juliaC.y
    intView[12] = this.renderer.hdrEnabled ? 1 : 0; // hdrEnabled
    floatView[13] = this.hdrBrightnessBias;         // hdrBrightnessBias
    intView[14] = paletteParams.type === 'cosine' ? 0 : 1; // paletteType
    intView[15] = palette.isMonotonic ? 1 : 0;       // isMonotonic

    // Pack palette parameters (offset 16 = 64 bytes)
    if (paletteParams.type === 'cosine') {
      // paletteA (vec3 + padding)
      floatView[16] = paletteParams.a[0];
      floatView[17] = paletteParams.a[1];
      floatView[18] = paletteParams.a[2];
      // padding at 19
      // paletteB
      floatView[20] = paletteParams.b[0];
      floatView[21] = paletteParams.b[1];
      floatView[22] = paletteParams.b[2];
      // padding at 23
      // paletteC
      floatView[24] = paletteParams.c[0];
      floatView[25] = paletteParams.c[1];
      floatView[26] = paletteParams.c[2];
      // padding at 27
      // paletteD
      floatView[28] = paletteParams.d[0];
      floatView[29] = paletteParams.d[1];
      floatView[30] = paletteParams.d[2];
      // padding at 31
    }

    // Gradient colors start at offset 32 (128 bytes)
    if (paletteParams.type === 'gradient') {
      // gradientC1
      floatView[32] = paletteParams.c1[0];
      floatView[33] = paletteParams.c1[1];
      floatView[34] = paletteParams.c1[2];
      // padding at 35
      // gradientC2
      floatView[36] = paletteParams.c2[0];
      floatView[37] = paletteParams.c2[1];
      floatView[38] = paletteParams.c2[2];
      // padding at 39
      // gradientC3
      floatView[40] = paletteParams.c3[0];
      floatView[41] = paletteParams.c3[1];
      floatView[42] = paletteParams.c3[2];
      // padding at 43
      // gradientC4
      floatView[44] = paletteParams.c4[0];
      floatView[45] = paletteParams.c4[1];
      floatView[46] = paletteParams.c4[2];
      // padding at 47
      // gradientC5
      floatView[48] = paletteParams.c5[0];
      floatView[49] = paletteParams.c5[1];
      floatView[50] = paletteParams.c5[2];
      // padding at 51
    }

    device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Render
    const commandEncoder = device.createCommandEncoder();
    const textureView = this.renderer.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.draw(3); // Fullscreen triangle
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  start(): void {
    this.renderer.start(() => this.render());
  }

  stop(): void {
    this.renderer.stop();
  }

  // --- Iteration controls ---

  private adjustMaxIterations(direction: 1 | -1): void {
    const isJulia = this.fractalType === FractalType.Julia ||
                    this.fractalType === FractalType.BurningShipJulia;
    const currentIter = this.maxIterationsOverride ??
                        maxIterationsForZoom(this.viewState.zoom, isJulia);
    const newIter = direction > 0
      ? currentIter * ITERATION_ADJUST_RATIO
      : currentIter / ITERATION_ADJUST_RATIO;
    this.maxIterationsOverride = Math.round(Math.max(1, newIter));
    this.render();
  }

  private clearMaxIterationsOverride(): void {
    this.maxIterationsOverride = null;
    this.render();
  }

  // --- HDR controls ---

  private toggleHDR(): void {
    // HDR is controlled by the renderer, we just adjust brightness bias
    console.log(`HDR is ${this.renderer.hdrEnabled ? 'enabled' : 'not available'}`);
    this.render();
  }

  /**
   * Adjust HDR brightness bias.
   * @param direction 1 for brighter (more of image is bright), -1 for dimmer
   */
  private adjustHdrBrightness(direction: 1 | -1): void {
    if (!this.renderer.hdrEnabled) return;
    // Adjust by 0.1 each step, clamped to -1 to +1
    // Positive direction = increase bias = brighter
    this.hdrBrightnessBias = Math.max(-1, Math.min(1, this.hdrBrightnessBias + direction * 0.1));
    this.render();
  }

  /**
   * Reset HDR brightness bias to default (0)
   */
  private resetHdrBrightness(): void {
    this.hdrBrightnessBias = 0;
    this.render();
  }

  // --- Palette controls ---

  private cyclePalette(direction: 1 | -1): void {
    this.paletteIndex = (this.paletteIndex + direction + PALETTE_COUNT) % PALETTE_COUNT;
    this.render();
  }

  private adjustColorOffset(delta: number): void {
    this.colorOffset += delta;
    this.render();
  }

  private resetColorOffset(): void {
    this.colorOffset = 0;
    this.render();
  }

  // --- Fractal type controls ---

  private cycleFractalType(direction: 1 | -1 = 1): void {
    if (this.fractalType === FractalType.Julia) {
      this.fractalType = FractalType.Mandelbrot;
    } else if (this.fractalType === FractalType.BurningShipJulia) {
      this.fractalType = FractalType.BurningShip;
    }
    this.fractalType = (this.fractalType + direction + 2) % 2;
    if (this.juliaPickerMode) {
      this.juliaPickerMode = false;
      this.inputHandler.setJuliaPickerMode(false);
    }
    this.render();
  }

  private toggleJuliaPickerMode(): void {
    if (this.fractalType === FractalType.Julia ||
        this.fractalType === FractalType.BurningShipJulia) {
      this.exitJuliaMode();
      return;
    }
    this.juliaPickerMode = !this.juliaPickerMode;
    this.inputHandler.setJuliaPickerMode(this.juliaPickerMode);
    this.render();
  }

  private pickJuliaConstant(fractalX: number, fractalY: number): void {
    if (!this.juliaPickerMode) return;

    this.savedViewState = {
      centerX: this.viewState.centerX,
      centerY: this.viewState.centerY,
      zoom: this.viewState.zoom,
    };
    this.savedFractalType = this.fractalType;

    this.juliaC = [fractalX, fractalY];
    this.fractalType = this.fractalType === FractalType.BurningShip
      ? FractalType.BurningShipJulia
      : FractalType.Julia;

    this.viewState.centerX = 0;
    this.viewState.centerY = 0;
    this.viewState.zoom = 0.5;

    this.juliaPickerMode = false;
    this.inputHandler.setJuliaPickerMode(false);
    this.render();
  }

  private exitJuliaMode(): void {
    if (this.savedViewState) {
      this.viewState.centerX = this.savedViewState.centerX;
      this.viewState.centerY = this.savedViewState.centerY;
      this.viewState.zoom = this.savedViewState.zoom;
      this.savedViewState = null;
    }
    if (this.savedFractalType !== null) {
      this.fractalType = this.savedFractalType;
      this.savedFractalType = null;
    } else {
      this.fractalType = this.fractalType === FractalType.BurningShipJulia
        ? FractalType.BurningShip
        : FractalType.Mandelbrot;
    }
    this.juliaPickerMode = false;
    this.inputHandler.setJuliaPickerMode(false);
    this.render();
  }

  // --- Bookmarks ---

  private getBookmarkState(): BookmarkState {
    return {
      fractalType: this.fractalType,
      centerX: this.viewState.centerX,
      centerY: this.viewState.centerY,
      zoom: this.viewState.zoom,
      paletteIndex: this.paletteIndex,
      colorOffset: this.colorOffset,
      juliaC: this.juliaC,
      maxIterationsOverride: this.maxIterationsOverride,
      aaEnabled: false, // AA not supported in WebGPU version
    };
  }

  private loadBookmark(): void {
    const bookmark = readUrlBookmark();
    if (!bookmark) return;

    if (bookmark.centerX !== undefined) this.viewState.centerX = bookmark.centerX;
    if (bookmark.centerY !== undefined) this.viewState.centerY = bookmark.centerY;
    if (bookmark.zoom !== undefined) this.viewState.zoom = bookmark.zoom;
    if (bookmark.maxIterationsOverride !== undefined) {
      this.maxIterationsOverride = bookmark.maxIterationsOverride;
    }
    if (bookmark.paletteIndex !== undefined) {
      this.paletteIndex = bookmark.paletteIndex % PALETTE_COUNT;
    }
    if (bookmark.colorOffset !== undefined) {
      this.colorOffset = bookmark.colorOffset;
    }
    if (bookmark.fractalType !== undefined) {
      this.fractalType = bookmark.fractalType;
    }
    if (bookmark.juliaC !== undefined) {
      this.juliaC = bookmark.juliaC;
    }

    this.render();
  }

  private goToLocation(key: string): void {
    const location = getLocationByKey(key);
    if (!location) return;

    const state = location.state;
    this.viewState.centerX = state.centerX;
    this.viewState.centerY = state.centerY;
    this.viewState.zoom = state.zoom;
    this.maxIterationsOverride = state.maxIterationsOverride;
    this.fractalType = state.fractalType;
    this.juliaC = state.juliaC;
    this.paletteIndex = state.paletteIndex;
    this.colorOffset = state.colorOffset;

    this.updateUrlBookmark();
    this.render();
  }

  private updateUrlBookmark(): void {
    updateUrlHash(this.getBookmarkState());
  }

  async shareBookmark(): Promise<void> {
    const success = await copyShareableUrl(this.getBookmarkState());
    this.showShareNotification(success);
    if (success) {
      this.updateUrlBookmark();
    }
  }

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

  // --- UI toggles ---

  private toggleHelp(): void {
    this.helpVisible = !this.helpVisible;
    if (this.helpOverlay) {
      this.helpOverlay.style.opacity = this.helpVisible ? '1' : '0';
      this.helpOverlay.style.pointerEvents = this.helpVisible ? 'auto' : 'none';
    }
  }

  private toggleScreenshotMode(): void {
    this.screenshotMode = !this.screenshotMode;
    if (this.screenshotMode && this.helpVisible) {
      this.helpVisible = false;
      if (this.helpOverlay) {
        this.helpOverlay.style.opacity = '0';
        this.helpOverlay.style.pointerEvents = 'none';
      }
    }
    if (this.debugOverlay) {
      this.debugOverlay.style.display = this.screenshotMode ? 'none' : 'block';
    }
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

  private createHelpContent(): string {
    return `
      <h2 style="margin: 0 0 16px 0; color: #60a5fa; font-size: 20px; font-weight: 600;">
        🌀 Fractal Explorer (WebGPU HDR) - Keyboard Shortcuts
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 32px;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">Navigation</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('Drag', 'Pan view')}
            ${this.helpRow('Scroll', 'Zoom in/out')}
            ${this.helpRow('Double-click', 'Zoom in at point')}
            ${this.helpRow('1-9', 'Famous locations')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">Iterations</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('+/-', 'Adjust iterations')}
            ${this.helpRow('0', 'Reset to auto')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">Colors</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('C / Shift+C', 'Cycle palettes')}
            ${this.helpRow(', / .', 'Shift colors (fine)')}
            ${this.helpRow('< / >', 'Shift colors (coarse)')}
            ${this.helpRow('R', 'Reset color offset')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">Fractal Type</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('F / Shift+F', 'Cycle fractals')}
            ${this.helpRow('J', 'Julia picker mode')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">HDR Brightness</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('B', 'More bright (extend)')}
            ${this.helpRow('Shift+B', 'Less bright (contract)')}
            ${this.helpRow('D', 'Reset brightness')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">UI</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('H', 'Toggle this help')}
            ${this.helpRow('Space', 'Screenshot mode')}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase;">Share</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow('S', 'Copy bookmark URL')}
          </div>
        </div>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 12px; text-align: center;">
        Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">H</kbd> to close
      </div>
    `;
  }

  private helpRow(key: string, description: string): string {
    return `
      <div style="display: flex; align-items: baseline; gap: 8px;">
        <kbd style="background: rgba(255,255,255,0.1); color: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; min-width: 60px; text-align: center;">${key}</kbd>
        <span style="color: #ccc;">${description}</span>
      </div>
    `;
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('hashchange', this.handleHashChange);
    this.debugOverlay?.remove();
    this.shareNotification?.remove();
    this.helpOverlay?.remove();
    this.inputHandler.destroy();
    this.renderer.destroy();
  }
}
