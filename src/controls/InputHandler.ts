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
  private onToggleAA: ToggleCallback | null = null;

  // Mouse/touch state
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastTouchDistance = 0;

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
   * Set callback for AA toggle (a key)
   */
  setToggleAACallback(callback: ToggleCallback): void {
    this.onToggleAA = callback;
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
    this.isDragging = true;
    const [x, y] = this.getScreenCoords(e.clientX, e.clientY);
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
    this.viewState.zoomAt(x, y, scaleZoomFactor(2.0), width, height);
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
      case 'a':
      case 'A':
        e.preventDefault();
        this.onToggleAA?.();
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
