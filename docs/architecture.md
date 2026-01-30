# Fractal Explorer - Architecture Overview

_"Sir, this document provides a technical overview of the system architecture for anyone joining the project. I've organized it by component responsibility."_
_— Jennifer Simms_

---

## Document Info

| Field        | Value                  |
|--------------|------------------------|
| Last Updated | January 2026           |
| Status       | Current implementation |
| Maintainer   | Simms (documentation)  |

---

## System Overview

Fractal Explorer is a GPU-accelerated Mandelbrot set renderer built with TypeScript and WebGL 2. The application runs entirely in the browser with no backend dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │   main.ts   │───▶│FractalEngine │───▶│  WebGLRenderer  │ │
│  │  (entry)    │    │(orchestrator)│    │   (context)     │ │
│  └─────────────┘    └──────┬───────┘    └────────┬────────┘ │
│                            │                     │          │
│                     ┌──────┴──────┐        ┌─────┴─────┐    │
│                     │             │        │           │    │
│              ┌──────▼─────┐ ┌─────▼────┐   │ShaderProgram   │
│              │InputHandler│ │ViewState │   │  (shaders)│    │
│              │  (events)  │ │(viewport)│   └───────────┘    │
│              └────────────┘ └──────────┘                    │
│                                                             │
│  GPU ═══════════════════════════════════════════════════    │
│  ║ mandelbrot.vert.glsl  │  mandelbrot.frag.glsl        ║   │
│  ║ (fullscreen quad)     │  (fractal computation)       ║   │
│  ║                       │  aa-post.frag.glsl           ║   │
│  ║                       │  (antialiasing post-pass)    ║   │
│  ═══════════════════════════════════════════════════════    │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer      | Technology  | Version |
|------------|-------------|---------|
| Language   | TypeScript  | ^5.3    |
| Build Tool | Vite        | ^5.0    |
| Rendering  | WebGL 2     | —       |
| Shaders    | GLSL ES 3.0 | —       |

---

## Core Components

### 1. Entry Point (`src/main.ts`)

Initializes the application:

- Creates the canvas element
- Instantiates `FractalEngine`
- Handles initialization errors with user-friendly messages
- Cleans up on page unload

### 2. Fractal Engine (`src/fractal/FractalEngine.ts`)

The central orchestrator that ties all components together.

**Responsibilities:**

- Initializes and owns all other components
- Manages the render loop
- Coordinates shader uniform updates
- Handles window resize
- Provides public API for iteration and color controls

**Key Features:**

- **Auto-scaling iterations**: Automatically increases `maxIterations` as zoom deepens (configurable with `+`/`-` keys)
- **12 color palettes**: Selectable via `c`/`C` keys
- **Color offset**: Shift the color cycle with `,`/`.` keys
- **Optional antialiasing**: Toggle with `a` key (two-pass render)
- **Debug overlay**: Shows current zoom level, iteration count, and palette name

**Render Pipeline:**

1. If AA enabled: render Mandelbrot to offscreen framebuffer
2. If AA enabled: apply post-process antialiasing to screen
3. If AA disabled: render Mandelbrot directly to screen

### 3. WebGL Renderer (`src/renderer/WebGLRenderer.ts`)

Manages the WebGL 2 context and canvas lifecycle.

**Responsibilities:**

- Acquires WebGL 2 context with optimal settings
- Handles high-DPI displays via `devicePixelRatio`
- Manages canvas resize
- Runs the animation frame loop
- Handles context loss/restore events

**Context Settings:**

```typescript
{
  antialias: false,      // Manual AA in post-pass
  depth: false,          // 2D rendering only
  stencil: false,        // Not needed
  alpha: false,          // Opaque background
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance'
}
```

### 4. Shader Program (`src/renderer/ShaderProgram.ts`)

Compiles, links, and manages GLSL shaders.

**Responsibilities:**

- Compiles vertex and fragment shaders
- Links into a WebGL program
- Caches uniform locations for performance
- Provides type-safe uniform setters
- Logs compilation errors with full source for debugging

### 5. View State (`src/controls/ViewState.ts`)

Manages the current viewport in fractal coordinate space.

**State:**

| Property  | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `centerX` | number | Real component of view center        |
| `centerY` | number | Imaginary component of view center   |
| `zoom`    | number | Zoom factor (1.0 = full set visible) |

**Methods:**

- `pan(deltaX, deltaY, screenW, screenH)` — Move view by screen pixels
- `zoomAt(screenX, screenY, factor, screenW, screenH)` — Zoom centered on cursor
- `toFractalCoords(screenX, screenY, screenW, screenH)` — Screen → fractal
- `toScreenCoords(fractalX, fractalY, screenW, screenH)` — Fractal → screen
- `reset()` — Return to initial view

**Initial View:**

- Center: `(-0.5, 0.0)` — Shows the full Mandelbrot set nicely centered
- Zoom: `1.0`

**Zoom Limits:**

- Minimum: `0.1` (zoom out)
- Maximum: `1e15` (limited by float32 precision)

### 6. Input Handler (`src/controls/InputHandler.ts`)

Translates browser events into view state changes.

**Supported Interactions:**

| Input        | Action                               |
|--------------|--------------------------------------|
| Mouse drag   | Pan                                  |
| Scroll wheel | Zoom at cursor                       |
| Double-click | Zoom in 2× at cursor                 |
| Touch drag   | Pan (mobile)                         |
| Pinch        | Zoom at midpoint (mobile)            |
| `+` / `-`    | Increase/decrease iterations         |
| `0`          | Reset to auto-scaling iterations     |
| `c` / `C`    | Cycle color palette forward/backward |
| `,` / `.`    | Shift color offset fine              |
| `<` / `>`    | Shift color offset coarse            |
| `a`          | Toggle antialiasing                  |

---

## Shaders

### Vertex Shader (`mandelbrot.vert.glsl`)

A minimal fullscreen quad shader:

- Takes 2D position in UV space (0–1)
- Outputs position in clip space (-1 to 1)
- Passes UV coordinates to fragment shader

### Fragment Shader (`mandelbrot.frag.glsl`)

The core fractal computation:

**Uniforms:**

| Uniform           | Type  | Description                      |
|-------------------|-------|----------------------------------|
| `u_resolution`    | vec2  | Canvas size in pixels            |
| `u_center`        | vec2  | View center in fractal coords    |
| `u_zoom`          | float | Current zoom level               |
| `u_maxIterations` | int   | Iteration limit                  |
| `u_time`          | float | Time in seconds (for animations) |
| `u_paletteIndex`  | int   | Color palette (0–11)             |
| `u_colorOffset`   | float | Color cycle offset               |

**Algorithm:**

1. Map pixel UV to complex coordinate `c`
2. Iterate `z = z² + c` until `|z| > 2` or max iterations reached
3. If max iterations reached: pixel is black (in set)
4. Otherwise: compute smooth iteration count for anti-banding
5. Map iteration to color via selected palette
6. Add subtle glow near boundary

**Color Palettes (12 total):**

| Index | Name      | Type      |
|-------|-----------|-----------|
| 0     | Rainbow   | Cycling   |
| 1     | Blue      | Monotonic |
| 2     | Gold      | Monotonic |
| 3     | Grayscale | Monotonic |
| 4     | Fire      | Cycling   |
| 5     | Ice       | Cycling   |
| 6     | Sepia     | Monotonic |
| 7     | Ocean     | Monotonic |
| 8     | Purple    | Monotonic |
| 9     | Forest    | Monotonic |
| 10    | Sunset    | Cycling   |
| 11    | Electric  | Cycling   |

### Post-Process Shader (`aa-post.frag.glsl`)

Edge-aware antialiasing:

- Black pixels (inside the set) are preserved
- Colored pixels are averaged with non-black neighbors
- Only applies where local contrast exceeds threshold
- Prevents color bleeding into the set

---

## Data Flow

### User Interaction Flow

```
User Input → InputHandler → ViewState → FractalEngine.render()
                                              ↓
                                        Set uniforms
                                              ↓
                                        Draw fullscreen quad
                                              ↓
                                        Fragment shader computes
                                        each pixel in parallel
```

### Render Loop

```
requestAnimationFrame loop
       ↓
FractalEngine.render()
       ↓
┌──────────────────────────┐
│ Pass 1: Mandelbrot       │
│ - Bind FBO (if AA) or 0  │
│ - Set uniforms           │
│ - Draw quad              │
└──────────────────────────┘
       ↓ (if AA enabled)
┌──────────────────────────┐
│ Pass 2: Post-process AA  │
│ - Bind screen (FBO 0)    │
│ - Sample render texture  │
│ - Apply edge smoothing   │
└──────────────────────────┘
```

---

## Performance Considerations

### Implemented Optimizations

- **GPU computation**: All fractal math runs in parallel on GPU
- **Uniform caching**: Shader uniform locations are cached
- **High-DPI support**: Canvas resolution matches device pixel ratio
- **Context settings**: Disabled unnecessary buffers (depth, stencil, alpha)
- **Discrete GPU preference**: Requests high-performance GPU when available

### Auto-Scaling Iterations

The iteration count scales with zoom depth to balance quality and performance:

```
maxIter = BASE + SCALE × log₁₀(zoom)^POWER
```

- Base: 256 iterations at zoom 1
- Auto cap: 4096 iterations (can be bypassed manually)
- User can override with `+`/`-` keys for extreme zooms

---

## File Structure

```
src/
├── main.ts                     # Application entry point
├── types.ts                    # TypeScript type definitions
├── controls/
│   ├── InputHandler.ts         # Mouse, touch, keyboard events
│   └── ViewState.ts            # Pan/zoom state management
├── fractal/
│   └── FractalEngine.ts        # Central orchestrator
└── renderer/
    ├── WebGLRenderer.ts        # WebGL context management
    ├── ShaderProgram.ts        # Shader compilation/linking
    └── shaders/
        ├── mandelbrot.vert.glsl   # Fullscreen quad vertex shader
        ├── mandelbrot.frag.glsl   # Fractal fragment shader
        └── aa-post.frag.glsl      # Antialiasing post-process
```

---

## Related Documents

| Document                                                           | Purpose                         |
|--------------------------------------------------------------------|---------------------------------|
| [README.md](../README.md)                                          | Quick start and user guide      |
| [fractal-webapp-spec.md](./fractal-webapp-spec.md)                 | Product vision and requirements |
| [phase-1-implementation-plan.md](./phase-1-implementation-plan.md) | Phase 1 technical plan          |
| [deep-zoom-precision-plan.md](./deep-zoom-precision-plan.md)       | Future precision improvements   |

---

## Browser Support

| Browser       | Minimum Version |
|---------------|-----------------|
| Chrome        | 56+             |
| Firefox       | 51+             |
| Safari        | 15+             |
| Edge          | 79+             |
| Mobile Chrome | 58+             |
| Mobile Safari | 15+             |

---

_"Documentation complete. I'll update this when the implementation changes."_
_— Jennifer Simms_
