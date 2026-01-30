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

Fractal Explorer is a GPU-accelerated fractal renderer built with TypeScript and WebGL 2. The application supports multiple fractal types (Mandelbrot, Burning Ship, Julia, and Burning Ship Julia) and runs entirely in the browser with no backend dependencies.

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

- **Multiple fractal types**: Mandelbrot, Burning Ship, Julia, and Burning Ship Julia (cycle with `f`/`F` keys)
- **Julia picker mode**: Select Julia constant by clicking on Mandelbrot/Burning Ship (`j` key)
- **Auto-scaling iterations**: Automatically increases `maxIterations` as zoom deepens (configurable with `+`/`-` keys)
- **12 color palettes**: Selectable via `c`/`C` keys
- **Color offset**: Shift the color cycle with `,`/`.` keys
- **Optional antialiasing**: Toggle with `a` key (two-pass render)
- **Famous locations**: 9 curated fractal spots accessible via number keys `1`–`9`
- **URL bookmarking**: Share views via URL hash parameters (`s` to copy link)
- **Help overlay**: In-app keyboard shortcut reference (`h` to toggle)
- **Screenshot mode**: Hide all UI for clean screenshots (`Space` to toggle)
- **Debug overlay**: Shows current fractal type, zoom level, iteration count, palette name, and Julia constant (when applicable)

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
| `f` / `F`    | Cycle fractal type forward/backward  |
| `j`          | Toggle Julia picker mode             |
| `+` / `-`    | Increase/decrease iterations         |
| `0`          | Reset to auto-scaling iterations     |
| `c` / `C`    | Cycle color palette forward/backward |
| `,` / `.`    | Shift color offset fine              |
| `<` / `>`    | Shift color offset coarse            |
| `r`          | Reset color offset                   |
| `a`          | Toggle antialiasing                  |
| `1`–`9`      | Jump to famous locations             |
| `s`          | Copy shareable URL to clipboard      |
| `h`          | Toggle help overlay                  |
| `Space`      | Toggle screenshot mode               |

### 7. Bookmark Manager (`src/bookmark/BookmarkManager.ts`)

Handles URL-based state persistence and sharing.

**Responsibilities:**

- Encodes application state into compact URL hash parameters
- Decodes state from URL hash on page load
- Updates browser URL without triggering navigation
- Copies shareable URLs to clipboard

**URL Parameters:**

| Param | Full Name    | Description                      |
|-------|--------------|----------------------------------|
| `t`   | type         | Fractal type (0–3)               |
| `x`   | centerX      | View center X coordinate         |
| `y`   | centerY      | View center Y coordinate         |
| `z`   | zoom         | Zoom level                       |
| `p`   | palette      | Color palette index (0–11)       |
| `o`   | colorOffset  | Color cycle offset               |
| `jr`  | juliaReal    | Julia constant real component    |
| `ji`  | juliaImag    | Julia constant imaginary component|
| `i`   | iterations   | Max iterations override          |
| `aa`  | antialiasing | AA enabled (1 if true)           |

### 8. Famous Locations (`src/bookmark/famousLocations.ts`)

Curated collection of interesting fractal coordinates.

**Available Locations:**

| Key | Name                 | Fractal Type       |
|-----|----------------------|--------------------|
| 1   | Seahorse Valley      | Mandelbrot         |
| 2   | Elephant Valley      | Mandelbrot         |
| 3   | Double Spiral Valley | Mandelbrot         |
| 4   | Spiral Galaxy        | Mandelbrot         |
| 5   | The Armada           | Burning Ship       |
| 6   | Douady Rabbit        | Julia              |
| 7   | Dragon Julia         | Julia              |
| 8   | Lightning Julia      | Julia              |
| 9   | Burning Ship Julia   | Burning Ship Julia |

Each location stores complete `BookmarkState` including position, zoom, fractal type, palette, color offset, and iteration settings.

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

| Uniform           | Type  | Description                          |
|-------------------|-------|--------------------------------------|
| `u_resolution`    | vec2  | Canvas size in pixels                |
| `u_center`        | vec2  | View center in fractal coords        |
| `u_zoom`          | float | Current zoom level                   |
| `u_maxIterations` | int   | Iteration limit                      |
| `u_time`          | float | Time in seconds (for animations)     |
| `u_paletteIndex`  | int   | Color palette (0–11)                 |
| `u_colorOffset`   | float | Color cycle offset                   |
| `u_fractalType`   | int   | Fractal type (0–3)                   |
| `u_juliaC`        | vec2  | Julia set constant (for Julia types) |

**Fractal Types:**

| Value | Name               | Formula                                     |
|-------|--------------------|---------------------------------------------|
| 0     | Mandelbrot         | z = z² + c                                  |
| 1     | Burning Ship       | z = (\|Re(z)\| + i\|Im(z)\|)² + c           |
| 2     | Julia              | z = z² + c (z starts at pixel, c fixed)     |
| 3     | Burning Ship Julia | Burning Ship with fixed c                   |

**Algorithm:**

1. Map pixel UV to complex coordinate
2. For Mandelbrot/Burning Ship: z starts at 0, c is pixel position
3. For Julia variants: z starts at pixel position, c is fixed constant
4. Iterate z = z² + c (with absolute value step for Burning Ship variants) until |z| > 2 or max iterations reached
5. If max iterations reached: pixel is black (in set)
6. Otherwise: compute smooth iteration count for anti-banding
7. Map iteration to color via selected palette
8. Add subtle glow near boundary

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
├── bookmark/
│   ├── BookmarkManager.ts      # URL-based state sharing
│   └── famousLocations.ts      # Curated famous fractal spots (keys 1-9)
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
