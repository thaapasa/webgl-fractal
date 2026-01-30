/**
 * Fractal Explorer - Main Entry Point
 *
 * "This is where the magic begins. You're welcome."
 * - Skippy the Magnificent
 */

import { FractalEngine } from './fractal/FractalEngine';

console.log('Fractal Explorer - Initializing...');

let engine: FractalEngine | null = null;

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Could not find #app element');
    return;
  }

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'fractal-canvas';
  app.appendChild(canvas);

  try {
    // Initialize the fractal engine
    engine = new FractalEngine(canvas);
    engine.start();

    console.log('Fractal Explorer initialized successfully');
    console.log('Controls:');
    console.log('  - Drag to pan');
    console.log('  - Scroll to zoom');
    console.log('  - Double-click to zoom in');
    console.log('  - Touch drag to pan (mobile)');
    console.log('  - Pinch to zoom (mobile)');
    console.log('  - + / - to adjust max iterations');
    console.log('  - 0 to reset iterations to auto-scaling');
    console.log('  - c / C to cycle color palettes (forward/backward)');
    console.log('  - , / . to shift colors (fine)');
    console.log('  - < / > to shift colors (coarse)');
    console.log('  - a to toggle antialiasing');
    console.log('  - s to share/copy bookmark URL');
    console.log('  - 1-9 to visit famous locations');
  } catch (error) {
    console.error('Failed to initialize Fractal Explorer:', error);
    app.innerHTML = `
      <div style="color: white; text-align: center; padding: 20px; font-family: system-ui, sans-serif;">
        <h1>Initialization Error</h1>
        <p>Failed to initialize the application.</p>
        <pre style="text-align: left; margin-top: 20px; color: #ff6b6b;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (engine) {
    engine.destroy();
  }
});
