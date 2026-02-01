/**
 * WebGPU Renderer - Manages WebGPU context and canvas with HDR support
 *
 * "Finally, a graphics API worthy of my magnificence."
 * - Skippy the Magnificent
 */

export class WebGPURenderer {
  public device!: GPUDevice;
  public context!: GPUCanvasContext;
  public readonly canvas: HTMLCanvasElement;
  public format!: GPUTextureFormat;

  private animationFrameId: number | null = null;
  private renderCallback: (() => void) | null = null;

  /** Whether HDR rendering is currently enabled and active. */
  public hdrEnabled: boolean = false;
  /** Whether the display currently reports HDR support. */
  private _displaySupportsHDR: boolean = false;
  /** Media query for dynamic range detection */
  private hdrMediaQuery: MediaQueryList | null = null;
  /** Callback for HDR status changes */
  private onHdrChangeCallback: (() => void) | null = null;

  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._displaySupportsHDR = this.detectHDRDisplay();
    this.setupHdrMediaQueryListener();
  }

  /**
   * Whether the display currently supports HDR
   */
  get displaySupportsHDR(): boolean {
    return this._displaySupportsHDR;
  }

  /**
   * Create and initialize a WebGPU renderer.
   * This is async because WebGPU initialization requires awaiting adapter/device.
   */
  static async create(canvas: HTMLCanvasElement): Promise<WebGPURenderer> {
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    return renderer;
  }

  /**
   * Check if WebGPU is supported in this browser.
   */
  static isSupported(): boolean {
    return 'gpu' in navigator;
  }

  private async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    console.log('WebGPU HDR capability check:');
    console.log('  - Display supports HDR:', this.displaySupportsHDR);
    console.log('  - dynamic-range: high:', window.matchMedia?.('(dynamic-range: high)').matches);
    console.log('  - color-gamut: p3:', window.matchMedia?.('(color-gamut: p3)').matches);

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    // Log adapter info (if available)
    if ('info' in adapter) {
      const info = (adapter as any).info;
      console.log('  - Adapter:', info?.vendor, info?.architecture);
    }

    this.device = await adapter.requestDevice();

    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    if (!this.context) {
      throw new Error('Failed to get WebGPU context');
    }

    // Configure for HDR if supported
    this.configureContext();

    console.log('WebGPU initialized successfully');
    if (this.hdrEnabled) {
      console.log('HDR mode enabled with rgba16float + extended tone mapping');
    }
  }

  /**
   * Configure the WebGPU context, optionally with HDR support.
   */
  private configureContext(): void {
    // Determine format - use rgba16float for HDR, otherwise preferred format
    const preferredFormat = navigator.gpu.getPreferredCanvasFormat();

    if (this.displaySupportsHDR) {
      // Try to configure with HDR
      try {
        this.format = 'rgba16float';
        this.context.configure({
          device: this.device,
          format: this.format,
          alphaMode: 'opaque',
          toneMapping: { mode: 'extended' }, // This unlocks HDR range!
        } as GPUCanvasConfiguration);
        this.hdrEnabled = true;
        console.log('  - Configured with rgba16float + extended tone mapping (HDR)');
      } catch (e) {
        console.log('  - HDR configuration failed, falling back to SDR:', e);
        this.format = preferredFormat;
        this.context.configure({
          device: this.device,
          format: this.format,
          alphaMode: 'opaque',
        });
        this.hdrEnabled = false;
      }
    } else {
      this.format = preferredFormat;
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'opaque',
      });
      this.hdrEnabled = false;
      console.log('  - Configured with', this.format, '(SDR)');
    }
  }

  /**
   * Resize the canvas to match the given dimensions
   */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * Get the current render target texture
   */
  getCurrentTexture(): GPUTexture {
    return this.context.getCurrentTexture();
  }

  /**
   * Start the render loop
   */
  start(renderCallback: () => void): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    this.renderCallback = renderCallback;
    const loop = () => {
      if (this.renderCallback) {
        this.renderCallback();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderCallback = null;
  }

  /**
   * Detect if the display supports HDR.
   */
  private detectHDRDisplay(): boolean {
    if (window.matchMedia?.('(dynamic-range: high)').matches) {
      return true;
    }
    // Note: color-gamut: p3 alone doesn't mean HDR, just wide gamut
    // But we'll use it as a fallback hint
    return false;
  }

  /**
   * Set up listener for HDR display changes (e.g., user toggles HDR in display settings)
   */
  private setupHdrMediaQueryListener(): void {
    if (!window.matchMedia) return;

    this.hdrMediaQuery = window.matchMedia('(dynamic-range: high)');

    const handleChange = () => {
      const newHdrSupport = this.detectHDRDisplay();
      if (newHdrSupport !== this._displaySupportsHDR) {
        console.log(`HDR display support changed: ${this._displaySupportsHDR} -> ${newHdrSupport}`);
        this._displaySupportsHDR = newHdrSupport;

        // Reconfigure context if we have one
        if (this.context && this.device) {
          this.configureContext();
        }

        // Notify listener
        this.onHdrChangeCallback?.();
      }
    };

    // Use addEventListener for modern browsers
    this.hdrMediaQuery.addEventListener?.('change', handleChange);
  }

  /**
   * Set callback for when HDR status changes
   */
  setOnHdrChange(callback: () => void): void {
    this.onHdrChangeCallback = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.onHdrChangeCallback = null;
    this.device?.destroy();
  }
}
