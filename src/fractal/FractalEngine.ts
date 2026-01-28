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

export class FractalEngine {
  private renderer: WebGLRenderer;
  private shaderProgram: ShaderProgram;
  private viewState: ViewState;
  private inputHandler: InputHandler;
  private maxIterations: number = 256;

  // Fullscreen quad geometry (two triangles)
  private quadBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize renderer
    this.renderer = new WebGLRenderer(canvas);

    // Initialize view state
    this.viewState = new ViewState();

    // Compile shaders
    this.shaderProgram = new ShaderProgram(
      this.renderer.gl,
      vertexShaderSource,
      fragmentShaderSource
    );

    // Create fullscreen quad
    this.setupGeometry();

    // Setup input handler
    this.inputHandler = new InputHandler(canvas, this.viewState, () => {
      // View state changed, trigger a render
      this.render();
    });

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
    this.render();
  }

  private render(): void {
    const gl = this.renderer.gl;

    // Clear
    this.renderer.clear(0.05, 0.05, 0.1, 1.0);

    // Use shader program
    this.shaderProgram.use();

    // Set uniforms
    this.shaderProgram.setUniform('u_resolution', [
      this.renderer.canvas.width,
      this.renderer.canvas.height,
    ]);
    this.shaderProgram.setUniform('u_center', [this.viewState.centerX, this.viewState.centerY]);
    this.shaderProgram.setUniform('u_zoom', this.viewState.zoom);
    this.shaderProgram.setUniformInt('u_maxIterations', this.maxIterations);
    
    // Color scheme (blue to purple gradient)
    this.shaderProgram.setUniform('u_colorA', [0.0, 0.1, 0.3]);
    this.shaderProgram.setUniform('u_colorB', [0.5, 0.2, 0.8]);
    this.shaderProgram.setUniform('u_time', performance.now() * 0.001);

    // Bind and draw quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation = 0; // Matches layout(location = 0) in vertex shader
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
   * Set maximum iterations (affects quality vs performance)
   */
  setMaxIterations(iterations: number): void {
    this.maxIterations = Math.max(1, Math.min(iterations, 1000));
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
    this.inputHandler.destroy();
    this.shaderProgram.destroy();
    this.renderer.destroy();
    
    if (this.quadBuffer) {
      this.renderer.gl.deleteBuffer(this.quadBuffer);
    }
  }
}
