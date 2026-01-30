/**
 * Input Handler - Translates browser events into view state changes
 *
 * "Event handling. Because apparently you monkeys can't click things properly."
 * - Skippy the Magnificent
 */

import { ViewState } from './ViewState';

export type ViewStateChangeCallback = (viewState: ViewState) => void;
export type IterationAdjustCallback = (direction: 1 | -1) => void;
export type IterationResetCallback = () => void;
export type PaletteCycleCallback = (direction: 1 | -1) => void;
export type ColorOffsetCallback = (delta: number) => void;
export type ToggleCallback = () => void;
export type FractalCycleCallback = (direction: 1 | -1) => void;
export type JuliaPickCallback = (fractalX: number, fractalY: number) => void;
export type ShareCallback = () => void;
export type LocationCallback = (key: string) => void;
export type HelpToggleCallback = () => void;
export type ScreenshotModeCallback = () => void;

/** Zoom sensitivity: 1 = full speed, 0.6 = 60% of current zoom deltas */
const ZOOM_SENSITIVITY = 0.6;

function scaleZoomFactor(factor: number): number {
  return 1 + (factor - 1) * ZOOM_SENSITIVITY;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private viewState: ViewState;
  private onChange: ViewStateChangeCallback;
  private onIterationAdjust: IterationAdjustCallback | null = null;
  private onIterationReset: IterationResetCallback | null = null;
  private onPaletteCycle: PaletteCycleCallback | null = null;
  private onColorOffset: ColorOffsetCallback | null = null;
  private onColorOffsetReset: ToggleCallback | null = null;
  private onToggleAA: ToggleCallback | null = null;
  private onFractalCycle: FractalCycleCallback | null = null;
  private onToggleJuliaMode: ToggleCallback | null = null;
  private onJuliaPick: JuliaPickCallback | null = null;
  private onShare: ShareCallback | null = null;
  private onLocationSelect: LocationCallback | null = null;
  private onToggleHelp: HelpToggleCallback | null = null;
  private onToggleScreenshotMode: ScreenshotModeCallback | null = null;

  // Mouse/touch state
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastTouchDistance = 0;

  // Julia picker mode state
  private juliaPickerMode = false;

  constructor(
    canvas: HTMLCanvasElement,
    viewState: ViewState,
    onChange: ViewStateChangeCallback
  ) {
    this.canvas = canvas;
    this.viewState = viewState;
    this.onChange = onChange;

    this.setupEventListeners();
  }

  /**
   * Set callback for iteration adjustment (+/- keys)
   */
  setIterationAdjustCallback(callback: IterationAdjustCallback): void {
    this.onIterationAdjust = callback;
  }

  /**
   * Set callback for iteration reset (0 key)
   */
  setIterationResetCallback(callback: IterationResetCallback): void {
    this.onIterationReset = callback;
  }

  /**
   * Set callback for palette cycling (c/C keys)
   */
  setPaletteCycleCallback(callback: PaletteCycleCallback): void {
    this.onPaletteCycle = callback;
  }

  /**
   * Set callback for color offset adjustment ([/] keys)
   */
  setColorOffsetCallback(callback: ColorOffsetCallback): void {
    this.onColorOffset = callback;
  }

  /**
   * Set callback for color offset reset (r key)
   */
  setColorOffsetResetCallback(callback: ToggleCallback): void {
    this.onColorOffsetReset = callback;
  }

  /**
   * Set callback for AA toggle (a key)
   */
  setToggleAACallback(callback: ToggleCallback): void {
    this.onToggleAA = callback;
  }

  /**
   * Set callback for fractal type cycling (f/F keys)
   */
  setFractalCycleCallback(callback: FractalCycleCallback): void {
    this.onFractalCycle = callback;
  }

  /**
   * Set callback for Julia mode toggle (j key)
   */
  setToggleJuliaModeCallback(callback: ToggleCallback): void {
    this.onToggleJuliaMode = callback;
  }

  /**
   * Set callback for Julia constant selection (click in picker mode)
   */
  setJuliaPickCallback(callback: JuliaPickCallback): void {
    this.onJuliaPick = callback;
  }

  /**
   * Set callback for share/bookmark (s key)
   */
  setShareCallback(callback: ShareCallback): void {
    this.onShare = callback;
  }

  /**
   * Set callback for famous location selection (1-9 keys)
   */
  setLocationSelectCallback(callback: LocationCallback): void {
    this.onLocationSelect = callback;
  }

  /**
   * Set callback for help overlay toggle (h key)
   */
  setToggleHelpCallback(callback: HelpToggleCallback): void {
    this.onToggleHelp = callback;
  }

  /**
   * Set callback for screenshot mode toggle (space key)
   */
  setToggleScreenshotModeCallback(callback: ScreenshotModeCallback): void {
    this.onToggleScreenshotMode = callback;
  }

  /**
   * Enable or disable Julia picker mode
   */
  setJuliaPickerMode(enabled: boolean): void {
    this.juliaPickerMode = enabled;
    this.canvas.style.cursor = enabled ? 'crosshair' : 'grab';
  }

  /**
   * Check if Julia picker mode is active
   */
  isJuliaPickerModeActive(): boolean {
    return this.juliaPickerMode;
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard events (on window for global capture)
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getCanvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  private getScreenCoords(clientX: number, clientY: number): [number, number] {
    const rect = this.getCanvasRect();
    return [clientX - rect.left, clientY - rect.top];
  }

  private getCanvasSize(): [number, number] {
    // Use CSS dimensions, not pixel dimensions (which include devicePixelRatio)
    const rect = this.getCanvasRect();
    return [rect.width, rect.height];
  }

  private notifyChange(): void {
    this.onChange(this.viewState);
  }

  // Mouse handlers
  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Only left button

    const [x, y] = this.getScreenCoords(e.clientX, e.clientY);

    // Julia picker mode: pick a point instead of panning
    if (this.juliaPickerMode && this.onJuliaPick) {
      const [width, height] = this.getCanvasSize();
      const [fractalX, fractalY] = this.viewState.toFractalCoords(x, y, width, height);
      this.onJuliaPick(fractalX, fractalY);
      return;
    }

    this.isDragging = true;
    this.lastX = x;
    this.lastY = y;
    this.canvas.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const [x, y] = this.getScreenCoords(e.clientX, e.clientY);
    const deltaX = x - this.lastX;
    const deltaY = y - this.lastY;

    const [width, height] = this.getCanvasSize();
    this.viewState.pan(deltaX, deltaY, width, height);
    this.notifyChange();

    this.lastX = x;
    this.lastY = y;
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const [x, y] = this.getScreenCoords(e.clientX, e.clientY);
    const raw = e.deltaY > 0 ? 0.9 : 1.1;
    const zoomFactor = scaleZoomFactor(raw);

    const [width, height] = this.getCanvasSize();
    this.viewState.zoomAt(x, y, zoomFactor, width, height);
    this.notifyChange();
  }

  private handleDoubleClick(e: MouseEvent): void {
    const [x, y] = this.getScreenCoords(e.clientX, e.clientY);
    const [width, height] = this.getCanvasSize();
    this.viewState.zoomToPoint(x, y, scaleZoomFactor(2.0), width, height);
    this.notifyChange();
  }

  // Touch handlers
  private getTouchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touches: TouchList): [number, number] {
    if (touches.length === 0) return [0, 0];
    if (touches.length === 1) {
      return this.getScreenCoords(touches[0].clientX, touches[0].clientY);
    }
    const x = (touches[0].clientX + touches[1].clientX) / 2;
    const y = (touches[0].clientY + touches[1].clientY) / 2;
    return this.getScreenCoords(x, y);
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      // Single touch - start pan
      this.isDragging = true;
      const [x, y] = this.getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
      this.lastX = x;
      this.lastY = y;
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      this.isDragging = false;
      this.lastTouchDistance = this.getTouchDistance(e.touches);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      // Single touch pan
      const [x, y] = this.getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
      const deltaX = x - this.lastX;
      const deltaY = y - this.lastY;

      const [width, height] = this.getCanvasSize();
    this.viewState.pan(deltaX, deltaY, width, height);
      this.notifyChange();

      this.lastX = x;
      this.lastY = y;
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = this.getTouchDistance(e.touches);
      const center = this.getTouchCenter(e.touches);

      if (this.lastTouchDistance > 0) {
        const raw = distance / this.lastTouchDistance;
        const zoomFactor = scaleZoomFactor(raw);
        const [width, height] = this.getCanvasSize();
        this.viewState.zoomAt(center[0], center[1], zoomFactor, width, height);
        this.notifyChange();
      }

      this.lastTouchDistance = distance;
    }
  }

  private handleTouchEnd(): void {
    this.isDragging = false;
    this.lastTouchDistance = 0;
  }

  // Keyboard handlers
  private handleKeyDown(e: KeyboardEvent): void {
    // Ignore if typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case '+':
      case '=': // Allow unshifted + key
        e.preventDefault();
        this.onIterationAdjust?.(1);
        break;
      case '-':
      case '_': // Allow shifted - key
        e.preventDefault();
        this.onIterationAdjust?.(-1);
        break;
      case '0':
        e.preventDefault();
        this.onIterationReset?.();
        break;
      case 'c':
        e.preventDefault();
        this.onPaletteCycle?.(1);
        break;
      case 'C':
        e.preventDefault();
        this.onPaletteCycle?.(-1);
        break;
      case '[':
      case ',':
        e.preventDefault();
        this.onColorOffset?.(-0.1);
        break;
      case ']':
      case '.':
        e.preventDefault();
        this.onColorOffset?.(0.1);
        break;
      case '{':
      case '<':
        e.preventDefault();
        this.onColorOffset?.(-0.5);
        break;
      case '}':
      case '>':
        e.preventDefault();
        this.onColorOffset?.(0.5);
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        this.onColorOffsetReset?.();
        break;
      case 'a':
      case 'A':
        e.preventDefault();
        this.onToggleAA?.();
        break;
      case 'f':
        e.preventDefault();
        this.onFractalCycle?.(1);
        break;
      case 'F':
        e.preventDefault();
        this.onFractalCycle?.(-1);
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        this.onToggleJuliaMode?.();
        break;
      case 's':
      case 'S':
        e.preventDefault();
        this.onShare?.();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        this.onLocationSelect?.(e.key);
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        this.onToggleHelp?.();
        break;
      case ' ':
        e.preventDefault();
        this.onToggleScreenshotMode?.();
        break;
    }
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    // Event listeners will be cleaned up when canvas is removed
    // But we could explicitly remove them if needed
  }
}
