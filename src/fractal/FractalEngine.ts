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

// Import shader sources
import vertexShaderSource from '../renderer/shaders/mandelbrot.vert.glsl?raw';
import fragmentShaderSource from '../renderer/shaders/mandelbrot.frag.glsl?raw';
import aaPostFragmentSource from '../renderer/shaders/aa-post.frag.glsl?raw';

/** Base iterations at zoom 1; scaled up with log(zoom) for deeper zooms. */
const MAX_ITERATIONS_BASE = 256;
const MAX_ITERATIONS_CAP = 4096;
/** Steep power curve: ~256@z1, ~1200@z18, ~3100@z350, cap@z~1e3. */
const MAX_ITERATIONS_LOG_SCALE = 640;
const MAX_ITERATIONS_LOG_POWER = 1.65;

function maxIterationsForZoom(zoom: number): number {
  const z = Math.max(1, zoom);
  const L = Math.log10(z);
  const n =
    MAX_ITERATIONS_BASE +
    MAX_ITERATIONS_LOG_SCALE * Math.pow(L, MAX_ITERATIONS_LOG_POWER);
  return Math.round(
    Math.max(MAX_ITERATIONS_BASE, Math.min(MAX_ITERATIONS_CAP, n))
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

  /** Overlay showing zoom and iteration count (for debugging). */
  private debugOverlay: HTMLElement | null = null;

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

    // Debug overlay: zoom + iterations
    const parent = canvas.parentElement;
    if (parent) {
      this.debugOverlay = document.createElement('div');
      this.debugOverlay.id = 'zoom-debug';
      parent.appendChild(this.debugOverlay);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initial resize
    this.handleResize();
  }

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

  private handleResize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.ensureRenderTargetSize();
    this.render();
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
    const maxIter =
      this.maxIterationsOverride ??
      maxIterationsForZoom(this.viewState.zoom);

    if (this.debugOverlay) {
      const z = this.viewState.zoom;
      const zoomStr = z >= 1e6 ? z.toExponential(2) : z < 1 ? z.toPrecision(4) : String(Math.round(z));
      this.debugOverlay.textContent = `zoom ${zoomStr}  ·  iterations ${maxIter}`;
    }

    // Pass 1: render Mandelbrot to texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    this.renderer.clear(0, 0, 0, 1);

    this.shaderProgram.use();
    this.shaderProgram.setUniform('u_resolution', [w, h]);
    this.shaderProgram.setUniform('u_center', [this.viewState.centerX, this.viewState.centerY]);
    this.shaderProgram.setUniform('u_zoom', this.viewState.zoom);
    this.shaderProgram.setUniformInt('u_maxIterations', maxIter);
    this.shaderProgram.setUniform('u_colorA', [0.0, 0.1, 0.3]);
    this.shaderProgram.setUniform('u_colorB', [0.5, 0.2, 0.8]);
    this.shaderProgram.setUniform('u_time', performance.now() * 0.001);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation = 0;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: AA post-process to screen
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
   */
  setMaxIterations(iterations: number): void {
    this.maxIterationsOverride = Math.round(
      Math.max(1, Math.min(iterations, MAX_ITERATIONS_CAP))
    );
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
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.debugOverlay?.remove();
    this.debugOverlay = null;
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
