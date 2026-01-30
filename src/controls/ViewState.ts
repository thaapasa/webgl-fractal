/**
 * View State - Manages the current viewport (pan and zoom)
 *
 * "Coordinate transformations. Because apparently you monkeys can't do math."
 * - Skippy the Magnificent
 */

import type { ViewState as IViewState } from '../types';

export class ViewState implements IViewState {
  public centerX: number;
  public centerY: number;
  public zoom: number;

  /**
   * Create a new view state
   * @param centerX Real component of center (-2.5 to 1.0 typical)
   * @param centerY Imaginary component of center (-1.5 to 1.5 typical)
   * @param zoom Zoom factor (1.0 = full set visible)
   */
  constructor(centerX: number = -0.5, centerY: number = 0.0, zoom: number = 0.4) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.zoom = zoom;
  }

  /**
   * Pan the view by screen pixels
   * @param deltaX Pixels to pan horizontally (positive = right)
   * @param deltaY Pixels to pan vertically (positive = down)
   * @param screenWidth Screen width in pixels
   * @param screenHeight Screen height in pixels
   */
  pan(deltaX: number, deltaY: number, screenWidth: number, screenHeight: number): void {
    // Convert screen pixel delta to fractal coordinate delta
    const fractalDeltaX = -deltaX / (this.zoom * screenWidth);
    const fractalDeltaY = deltaY / (this.zoom * screenHeight);
    
    this.centerX += fractalDeltaX;
    this.centerY += fractalDeltaY;
  }

  /**
   * Zoom centered on a specific screen point
   * @param screenX Screen X coordinate (0 to screenWidth)
   * @param screenY Screen Y coordinate (0 to screenHeight)
   * @param factor Zoom factor (> 1 = zoom in, < 1 = zoom out)
   * @param screenWidth Screen width in pixels
   * @param screenHeight Screen height in pixels
   */
  zoomAt(
    screenX: number,
    screenY: number,
    factor: number,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Convert screen point to fractal coordinates before zoom
    const fractalX = this.centerX + (screenX / screenWidth - 0.5) / this.zoom;
    const fractalY = this.centerY - (screenY / screenHeight - 0.5) / this.zoom;
    
    // Apply zoom
    this.zoom *= factor;
    
    // Clamp zoom to reasonable limits
    this.zoom = Math.max(0.1, Math.min(this.zoom, 1e15));
    
    // Adjust center so the point under cursor stays fixed
    const newFractalX = this.centerX + (screenX / screenWidth - 0.5) / this.zoom;
    const newFractalY = this.centerY - (screenY / screenHeight - 0.5) / this.zoom;
    
    this.centerX += fractalX - newFractalX;
    this.centerY += fractalY - newFractalY;
  }

  /**
   * Convert screen coordinates to fractal coordinates
   * @param screenX Screen X coordinate (0 to screenWidth)
   * @param screenY Screen Y coordinate (0 to screenHeight)
   * @param screenWidth Screen width in pixels
   * @param screenHeight Screen height in pixels
   */
  toFractalCoords(screenX: number, screenY: number, screenWidth: number, screenHeight: number): [number, number] {
    const aspect = screenWidth / screenHeight;
    const uvX = (screenX / screenWidth - 0.5) * aspect;
    const uvY = screenY / screenHeight - 0.5;
    const fractalX = this.centerX + uvX / this.zoom;
    const fractalY = this.centerY - uvY / this.zoom;
    return [fractalX, fractalY];
  }

  /**
   * Convert fractal coordinates to screen coordinates
   * @param fractalX Fractal X coordinate
   * @param fractalY Fractal Y coordinate
   * @param screenWidth Screen width in pixels
   * @param screenHeight Screen height in pixels
   */
  toScreenCoords(fractalX: number, fractalY: number, screenWidth: number, screenHeight: number): [number, number] {
    const aspect = screenWidth / screenHeight;
    const uvX = (fractalX - this.centerX) * this.zoom;
    const uvY = (fractalY - this.centerY) * this.zoom;
    const screenX = (uvX / aspect + 0.5) * screenWidth;
    const screenY = (-uvY + 0.5) * screenHeight;
    return [screenX, screenY];
  }

  /**
   * Center on a screen point and then zoom in
   * @param screenX Screen X coordinate (0 to screenWidth)
   * @param screenY Screen Y coordinate (0 to screenHeight)
   * @param factor Zoom factor (> 1 = zoom in, < 1 = zoom out)
   * @param screenWidth Screen width in pixels
   * @param screenHeight Screen height in pixels
   */
  zoomToPoint(
    screenX: number,
    screenY: number,
    factor: number,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Convert screen point to fractal coordinates and center on it
    const [fractalX, fractalY] = this.toFractalCoords(screenX, screenY, screenWidth, screenHeight);
    this.centerX = fractalX;
    this.centerY = fractalY;

    // Apply zoom
    this.zoom *= factor;

    // Clamp zoom to reasonable limits
    this.zoom = Math.max(0.1, Math.min(this.zoom, 1e15));
  }

  /**
   * Reset to initial view
   */
  reset(): void {
    this.centerX = -0.5;
    this.centerY = 0.0;
    this.zoom = 0.4;
  }
}
