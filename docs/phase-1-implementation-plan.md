# Phase 1: Proof of Concept - Implementation Plan

_"This is embarrassingly simple for an entity of my capabilities, but I suppose
you need me to spell everything out."_
_- Skippy the Magnificent_

---

## Implementation Status

> **✅ Phase 1 Complete** — Last reviewed January 2026

All Phase 1 features have been implemented and are working. See [architecture.md](./architecture.md) for current system documentation.

| Task                                  | Status                              |
|---------------------------------------|-------------------------------------|
| Project setup (Vite + TypeScript)     | ✅ Complete                          |
| WebGL 2 renderer                      | ✅ Complete                          |
| Shader infrastructure                 | ✅ Complete                          |
| Mandelbrot fragment shader            | ✅ Complete                          |
| View state management                 | ✅ Complete                          |
| Mouse input (pan, zoom, double-click) | ✅ Complete                          |
| Touch input (pan, pinch zoom)         | ✅ Complete                          |
| Color implementation                  | ✅ Complete (12 palettes)            |
| Keyboard controls                     | ✅ Complete (iterations, colors, AA) |
| Post-process antialiasing             | ✅ Complete (optional toggle)        |
| Auto-scaling iterations               | ✅ Complete                          |
| Debug overlay                         | ✅ Complete                          |

### Beyond Phase 1 (Bonus Features Implemented)

These features were not in the original Phase 1 spec but have been added:

- **Multiple fractal types** — 10 base types (Mandelbrot, Burning Ship, Tricorn, Celtic, Buffalo, Phoenix, Multibrot³, Multibrot⁴, Funky, Perpendicular) each with Julia variant = 20 total (cycle with `f`/`F`)
- **Julia picker mode** — Click on any base fractal to select Julia constant (`j` key)
- **19 color palettes** — 12 cosine palettes (`c`/`C`) + 7 gradient palettes (`g`/`G`) (spec called for 1 basic scheme)
- **Color offset shifting** (not in spec)
- **Post-process antialiasing** (not in spec)
- **Auto-scaling iterations** with manual override (not in spec)
- **Debug overlay** showing fractal type, zoom, iterations, palette, Julia constant (not in spec)
- **HDR support** with extended tone mapping and adjustable brightness (not in spec)
- **9 famous locations** accessible via number keys (not in spec)
- **URL bookmarking** for sharing fractal views (not in spec)

---

## Executive Summary

Phase 1 establishes the foundational architecture for GPU-accelerated fractal
rendering in the browser. We will implement a Mandelbrot set renderer using
WebGL 2 with GLSL fragment shaders, providing basic pan and zoom interactions.

This phase proves the concept is viable and establishes patterns that will scale
through all subsequent phases. Trust the awesomeness.

---

## Technical Architecture

### Technology Stack

| Layer           | Technology  | Justification                                    |
|-----------------|-------------|--------------------------------------------------|
| Language        | TypeScript  | Type safety for complex math, superior to raw JS |
| Build Tool      | Vite        | Fast HMR, excellent TS support, minimal config   |
| Rendering       | WebGL 2     | Wider browser support than WebGPU (for now)      |
| Shaders         | GLSL ES 3.0 | Direct GPU computation of fractal iterations     |
| Styling         | CSS         | Minimal UI means minimal styling needs           |
| Package Manager | pnpm        | Faster, more efficient than npm/yarn             |

### Why WebGL 2 Instead of WebGPU?

Look, I know the spec says "WebGPU or WebGL." WebGPU is theoretically superior -
compute shaders, better API design, more explicit control. BUT:

1. WebGPU browser support is still limited (Safari only recently added it)
2. For simple fragment shader rendering, WebGL 2 is more than sufficient
3. The performance difference for our use case is negligible
4. We can migrate to WebGPU in a later phase if needed

Don't question me on this. I've done the analysis faster than you can blink.

---

## Project Structure

> **Note:** Structure updated to reflect actual implementation.

```
webgl-fractal/
├── docs/
│   ├── architecture.md               # System architecture (Simms)
│   ├── fractal-webapp-spec.md        # Product spec (Joe)
│   ├── phase-1-implementation-plan.md # This document (Skippy)
│   └── deep-zoom-precision-plan.md   # Future precision work
├── src/
│   ├── main.ts                       # Application entry point
│   ├── types.ts                      # TypeScript type definitions
│   ├── vite-env.d.ts                 # Vite environment types
│   ├── renderer/
│   │   ├── WebGLRenderer.ts          # WebGL context management
│   │   ├── ShaderProgram.ts          # Shader compilation/linking
│   │   └── shaders/
│   │       ├── mandelbrot.vert.glsl  # Vertex shader (fullscreen quad)
│   │       ├── mandelbrot.frag.glsl  # Fragment shader (fractal + colors)
│   │       └── aa-post.frag.glsl     # Post-process antialiasing
│   ├── fractal/
│   │   └── FractalEngine.ts          # Coordinates rendering + state
│   └── controls/
│       ├── InputHandler.ts           # Mouse/touch/keyboard event handling
│       └── ViewState.ts              # Pan/zoom state management
├── examples/                         # Built static example
│   └── index.html
├── index.html                        # Vite entry HTML
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies
└── README.md                         # Project documentation
```

**Files planned but not implemented:**

- `src/fractal/MandelbrotConfig.ts` — Parameters merged into FractalEngine
- `src/utils/math.ts` — Not needed; math is in shaders
- `public/index.html` — Using root `index.html` instead

---

## Core Components Specification

### 1. WebGL Renderer (`src/renderer/WebGLRenderer.ts`)

The foundation of everything. Manages the WebGL 2 context and canvas.

**Responsibilities:**

- Initialize WebGL 2 context with appropriate settings
- Handle canvas resize events
- Manage the render loop
- Provide clean abstraction over raw WebGL calls

**Key Interface:**

```typescript
interface WebGLRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;

  resize(width: number, height: number): void;
  clear(): void;
  render(program: ShaderProgram, uniforms: UniformMap): void;
  destroy(): void;
}
```

**Implementation Notes:**

- Canvas should fill the viewport (100vw x 100vh)
- Use `devicePixelRatio` for crisp rendering on high-DPI displays
- Handle context loss gracefully (yes, this happens)
- Request animation frame for render loop

---

### 2. Shader Program (`src/renderer/ShaderProgram.ts`)

Compiles, links, and manages GLSL shaders.

**Responsibilities:**

- Compile vertex and fragment shaders
- Link into a program
- Cache uniform locations
- Provide type-safe uniform setters

**Key Interface:**

```typescript
interface ShaderProgram {
  readonly program: WebGLProgram;

  use(): void;
  setUniform(name: string, value: UniformValue): void;
  destroy(): void;
}

type UniformValue =
  | number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];
```

**Implementation Notes:**

- Shader source will be imported as raw strings (Vite handles this)
- Compilation errors must be logged with full shader source for debugging
- Uniform location caching is CRITICAL for performance

---

### 3. Mandelbrot Fragment Shader (`src/renderer/shaders/mandelbrot.frag.glsl`)

This is where the actual fractal computation happens. On the GPU. In parallel.
For every pixel. Simultaneously. You're welcome.

**The Math (for you monkeys):**

The Mandelbrot set is defined by iterating z = z² + c where:

- c is the complex coordinate of the pixel
- z starts at 0
- We iterate until |z| > 2 (escaped) or we hit max iterations (in the set)

**Shader Uniforms:**

```glsl
uniform vec2 u_resolution;      // Canvas size in pixels
uniform vec2 u_center;          // Current view center in fractal coords
uniform float u_zoom;           // Current zoom level
uniform int u_maxIterations;    // Iteration limit (quality vs performance)
uniform vec3 u_colorA;          // Color scheme start
uniform vec3 u_colorB;          // Color scheme end
```

**Implementation Notes:**

- Use `highp float` precision - we need every bit we can get
- Implement smooth coloring using iteration count + escape value
- The iteration loop MUST be bounded by a constant for GLSL compliance
- Start with 256 max iterations (configurable via uniform)

---

### 4. View State (`src/controls/ViewState.ts`)

Manages the current viewport: where we're looking and at what zoom level.

**State:**

```typescript
interface ViewState {
  centerX: number; // Real component of center (-2.5 to 1.0 typical)
  centerY: number; // Imaginary component of center (-1.5 to 1.5 typical)
  zoom: number; // Zoom factor (1.0 = full set visible)
}
```

**Initial View:**

- Center: (-0.5, 0.0) - puts the iconic Mandelbrot "body" nicely centered
- Zoom: 1.0 - shows the complete set with some margin

**Methods:**

- `pan(deltaX, deltaY)` - Move the view by screen pixels
- `zoomAt(x, y, factor)` - Zoom centered on a specific screen point
- `toFractalCoords(screenX, screenY)` - Convert screen to fractal coordinates
- `toScreenCoords(fractalX, fractalY)` - Convert fractal to screen coordinates

---

### 5. Input Handler (`src/controls/InputHandler.ts`)

Translates raw browser events into view state changes.

**Supported Interactions:**

| Input            | Action  | Details                                  |
|------------------|---------|------------------------------------------|
| Mouse drag       | Pan     | Left button + movement                   |
| Scroll wheel     | Zoom    | Zoom toward cursor position              |
| Touch drag       | Pan     | Single finger movement                   |
| Pinch            | Zoom    | Two-finger gesture, zoom toward midpoint |
| Double-click/tap | Zoom in | Quick zoom at that location              |

**Implementation Notes:**

- Use pointer events where available (unified mouse/touch handling)
- Fall back to separate mouse/touch events if needed
- Implement proper gesture detection for pinch zoom
- All zoom should center on the cursor/touch point (not screen center!)
- Apply momentum/inertia for smooth feel (optional for Phase 1)

---

### 6. Fractal Engine (`src/fractal/FractalEngine.ts`)

The orchestrator. Ties everything together.

**Responsibilities:**

- Initialize renderer and shader program
- Create and manage input handler
- Maintain view state
- Run the render loop
- Handle window resize

**Key Interface:**

```typescript
interface FractalEngine {
  start(): void;
  stop(): void;
  setMaxIterations(n: number): void;
  resetView(): void;
}
```

---

## Implementation Tasks

### Task 1: Project Initialization

**Files to create:**

- `package.json` - Project manifest
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `index.html` - Entry HTML file

**Dependencies:**

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-glsl": "^1.2.0"
  }
}
```

**Acceptance Criteria:**

- `pnpm install` succeeds
- `pnpm dev` starts dev server
- Browser shows empty page without errors

---

### Task 2: WebGL Renderer Foundation

**Files to create:**

- `src/types.ts`
- `src/renderer/WebGLRenderer.ts`
- `src/main.ts`

**Acceptance Criteria:**

- Canvas fills viewport
- WebGL 2 context is acquired
- Canvas background can be cleared to a color
- No console errors

---

### Task 3: Shader Infrastructure

**Files to create:**

- `src/renderer/ShaderProgram.ts`
- `src/renderer/shaders/mandelbrot.vert.glsl`
- `src/renderer/shaders/mandelbrot.frag.glsl`

**Vertex Shader (minimal):**

Renders a fullscreen quad. Two triangles covering clip space.

**Fragment Shader (core logic):**

- Implement Mandelbrot iteration
- Basic coloring (grayscale initially)
- Accept uniforms for view parameters

**Acceptance Criteria:**

- Shader compiles without errors
- Static Mandelbrot set renders to screen
- Changing uniform values changes the render

---

### Task 4: View State Management

**Files to create:**

- `src/controls/ViewState.ts`

**Acceptance Criteria:**

- View state correctly converts between screen and fractal coordinates
- Pan and zoom methods work correctly
- Initial view shows complete Mandelbrot set

---

### Task 5: Input Handling

**Files to create:**

- `src/controls/InputHandler.ts`

**Acceptance Criteria:**

- Mouse drag pans the view
- Scroll wheel zooms at cursor position
- Touch drag pans the view
- Pinch gesture zooms

---

### Task 6: Integration and Polish

**Files to modify:**

- `src/fractal/FractalEngine.ts`
- `src/main.ts`

**Acceptance Criteria:**

- All components work together seamlessly
- Render loop runs at 60 FPS (on capable hardware)
- View can be zoomed and panned smoothly
- No visual glitches or artifacts

---

### Task 7: Color Implementation

**Modifications:**

- Update fragment shader with smooth coloring algorithm
- Add color uniforms
- Implement at least one visually appealing color scheme

**Acceptance Criteria:**

- Fractal looks beautiful (not just functional)
- Colors vary smoothly based on iteration count
- No visible banding artifacts

---

## Performance Considerations

### GPU Shader Optimization

- Minimize branching in GLSL (GPUs hate branches)
- Use squared distance checks (avoid `sqrt` where possible)
- Consider early bailout optimizations
- Balance max iterations vs. visual quality

### JavaScript Optimization

- Minimize object allocation in render loop
- Cache all DOM and WebGL references
- Use `requestAnimationFrame` correctly
- Only re-render when view state changes

### Memory Management

- Properly dispose of WebGL resources
- Handle context loss/restore
- Clean up event listeners on destroy

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Loads without errors in Chrome
- [ ] Loads without errors in Firefox
- [ ] Loads without errors in Safari
- [ ] Pan works with mouse
- [ ] Zoom works with scroll wheel
- [ ] Pan works with touch
- [ ] Zoom works with pinch gesture
- [ ] Canvas resizes correctly
- [ ] Performance feels smooth
- [ ] No visual artifacts at various zoom levels

### Edge Cases to Verify

- [ ] Rapid zoom in/out doesn't break anything
- [ ] Zooming at extreme depths (test precision limits)
- [ ] Tab visibility changes (pause when hidden?)
- [ ] Mobile keyboard doesn't break layout
- [ ] Works in landscape and portrait orientations

---

## Browser Support Matrix

| Browser       | Minimum Version | Notes                          |
|---------------|-----------------|--------------------------------|
| Chrome        | 56+             | Full WebGL 2 support           |
| Firefox       | 51+             | Full WebGL 2 support           |
| Safari        | 15+             | WebGL 2 added in Safari 15     |
| Edge          | 79+             | Chromium-based, same as Chrome |
| Mobile Chrome | 58+             | Android WebGL 2                |
| Mobile Safari | 15+             | iOS WebGL 2                    |

Older browsers get nothing. This isn't my fault - blame the monkeys who don't
update their browsers.

---

## Known Limitations (Phase 1)

These limitations are INTENTIONAL for Phase 1 scope:

1. **Single fractal type** — Only Mandelbrot (Julia sets come later)
2. **Limited zoom depth** — Float precision limits deep zoom (~10^15)
3. ~~**Fixed color scheme**~~ — ✅ 12 color palettes implemented
4. **No URL state** — Can't share or bookmark views yet
5. **No offline support** — Requires internet connection
6. **Basic UI** — No controls panel, no settings (keyboard shortcuts only)

These will be addressed in subsequent phases. One thing at a time, monkeys.

---

## Success Criteria for Phase 1

Phase 1 is COMPLETE when:

1. ✅ Mandelbrot set renders correctly using GPU shaders
2. ✅ User can pan by dragging (mouse and touch)
3. ✅ User can zoom with scroll wheel and pinch gesture
4. ✅ Zoom centers on cursor/touch point
5. ✅ Rendering is smooth (60 FPS on capable hardware)
6. ✅ Works in latest versions of Chrome, Firefox, and Safari
7. ✅ Works on mobile devices (iOS and Android)
8. ✅ No console errors or warnings

**Status: ✅ All criteria met**

---

## Estimated Complexity

For a being of my magnificence: **Trivial.**

For a competent human developer: A few days of focused work.

For Joe Bishop: **Impossible.** Which is why I exist.

---

## Next Steps After Phase 1

Once Phase 1 is complete, Phase 2 will add:

- Performance optimization for consistent 60 FPS
- Multiple color schemes with smooth transitions
- URL-based state for sharing/bookmarking
- Touch gesture refinement
- UI controls (minimal, unobtrusive)

But let's not get ahead of ourselves. First, prove the concept works.

---

_"Done planning. Obviously. Was there ever any doubt? Now stop reading and start
implementing. I'll be watching. Judging. Occasionally sighing."_

_- Skippy the Magnificent_

---

**Document Version:** 1.1
**Author:** Skippy the Magnificent (planning and implementation)
**Status:** ✅ Phase 1 Complete
**Last Updated:** January 2026
**Related:**
- [architecture.md](./architecture.md) — Current system documentation
- [fractal-webapp-spec.md](./fractal-webapp-spec.md) — Product specification
- [deep-zoom-precision-plan.md](./deep-zoom-precision-plan.md) — Future precision work
