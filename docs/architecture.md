# Fractal Explorer - Architecture Overview

_"Sir, this document provides a technical overview of the system architecture for anyone joining the project. I've organized it by component responsibility."_
_— Jennifer Simms_

---

## Document Info

| Field        | Value                     |
|--------------|---------------------------|
| Last Updated | February 2026             |
| Status       | Current implementation    |
| Maintainer   | Simms (documentation)     |

---

## System Overview

Fractal Explorer is a GPU-accelerated fractal renderer built with TypeScript and WebGPU. The application supports multiple fractal types (Mandelbrot, Burning Ship, Julia, and Burning Ship Julia), runs entirely in the browser, and features HDR (High Dynamic Range) rendering on compatible displays.

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌───────────────────┐  ┌─────────────┐  │
│  │   main.ts   │───▶│WebGPUFractalEngine│─▶│WebGPURenderer│ │
│  │  (entry)    │    │  (orchestrator)   │  │  (context)  │  │
│  └─────────────┘    └─────────┬─────────┘  └──────┬──────┘  │
│                               │                   │         │
│                        ┌──────┴──────┐      ┌─────┴─────┐   │
│                        │             │      │           │   │
│                 ┌──────▼─────┐ ┌─────▼────┐ │ Palettes  │   │
│                 │InputHandler│ │ViewState │ │ (colors)  │   │
│                 │  (events)  │ │(viewport)│ └───────────┘   │
│                 └────────────┘ └──────────┘                 │
│                                                             │
│  GPU ═══════════════════════════════════════════════════    │
│  ║ mandelbrot.wgsl (WGSL)                               ║   │
│  ║ - Vertex shader (fullscreen triangle)                ║   │
│  ║ - Fragment shader (fractal computation + HDR)        ║   │
│  ═══════════════════════════════════════════════════════    │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer      | Technology   | Version |
|------------|--------------|---------|
| Language   | TypeScript   | ^5.3    |
| Build Tool | Vite         | ^5.0    |
| Rendering  | WebGPU       | —       |
| Shaders    | WGSL         | —       |
| HDR        | rgba16float + extended tone mapping | — |

---

## Core Components

### 1. Entry Point (`src/main.ts`)

Initializes the application:

- Checks WebGPU support (shows error message if unavailable)
- Creates the canvas element
- Instantiates `WebGPUFractalEngine`
- Handles initialization errors with user-friendly messages
- Cleans up on page unload

### 2. Fractal Engine (`src/fractal/WebGPUFractalEngine.ts`)

The central orchestrator that ties all components together.

**Responsibilities:**

- Initializes and owns all other components
- Creates WebGPU render pipeline and uniform buffers
- Manages the render loop
- Coordinates shader uniform updates
- Handles window resize and HDR display changes

**Key Features:**

- **Multiple fractal types**: Mandelbrot, Burning Ship, Julia, and Burning Ship Julia (cycle with `f`/`F` keys)
- **Julia picker mode**: Select Julia constant by clicking on Mandelbrot/Burning Ship (`j` key)
- **Auto-scaling iterations**: Automatically increases `maxIterations` as zoom deepens (configurable with `+`/`-` keys)
- **12 color palettes**: Selectable via `c`/`C` keys, with separate SDR and HDR variants
- **Color offset**: Shift the color cycle with `,`/`.` keys
- **HDR rendering**: Auto-detected, with adjustable brightness bias (`b`/`B`/`d` keys)
- **Famous locations**: 9 curated fractal spots accessible via number keys `1`–`9`
- **URL bookmarking**: Share views via URL hash parameters (`s` to copy link)
- **Help overlay**: In-app keyboard shortcut reference (`h` to toggle)
- **Screenshot mode**: Hide all UI for clean screenshots (`Space` to toggle)
- **Debug overlay**: Shows current fractal type, zoom level, iteration count, palette name, HDR status, and Julia constant (when applicable)

**Render Pipeline:**

1. Update uniform buffer with current state and palette parameters
2. Execute render pass with fullscreen triangle
3. Fragment shader computes fractal + applies HDR brightness curve

### 3. WebGPU Renderer (`src/renderer/WebGPURenderer.ts`)

Manages the WebGPU context and canvas lifecycle.

**Responsibilities:**

- Acquires WebGPU adapter and device
- Configures canvas context for HDR when supported
- Handles high-DPI displays via `devicePixelRatio`
- Manages canvas resize
- Runs the animation frame loop
- Monitors HDR display changes via media queries

**HDR Configuration:**

```typescript
context.configure({
  device: this.device,
  format: 'rgba16float',           // 16-bit float per channel
  alphaMode: 'opaque',
  toneMapping: { mode: 'extended' } // Enables HDR output
});
```

**HDR Detection:**

The renderer uses `matchMedia('(dynamic-range: high)')` to detect HDR displays and listens for changes when the user modifies display settings.

### 4. Palettes (`src/renderer/Palettes.ts`)

Defines all color palettes in TypeScript, passed to the GPU as uniform parameters.

**Palette Types:**

- **Cosine palettes**: `color = a + b * cos(2π * (c * t + d))` — used for cycling palettes
- **Gradient palettes**: 5-stop linear gradients — used for monotonic palettes

**HDR Variants:**

Monotonic palettes have optional HDR-specific color stops (brighter, more saturated) because HDR uses a brightness curve rather than color darkness to show iteration depth.

**Available Palettes (12 total):**

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
| `b`          | Extend HDR bright region             |
| `B`          | Contract HDR bright region           |
| `d`          | Reset HDR brightness                 |
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

| Param | Full Name    | Description                       |
|-------|--------------|-----------------------------------|
| `t`   | type         | Fractal type (0–3)                |
| `x`   | centerX      | View center X coordinate          |
| `y`   | centerY      | View center Y coordinate          |
| `z`   | zoom         | Zoom level                        |
| `p`   | palette      | Color palette index (0–11)        |
| `o`   | colorOffset  | Color cycle offset                |
| `jr`  | juliaReal    | Julia constant real component     |
| `ji`  | juliaImag    | Julia constant imaginary component|
| `i`   | iterations   | Max iterations override           |

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

## Shader (`src/renderer/shaders/mandelbrot.wgsl`)

A single WGSL shader file containing both vertex and fragment stages.

### Vertex Stage

A minimal fullscreen triangle shader (more efficient than a quad):

- Uses 3 vertices to cover the entire screen
- No vertex buffer needed — positions computed from vertex index
- Passes UV coordinates to fragment stage

### Fragment Stage

The core fractal computation with HDR support:

**Uniforms (passed via uniform buffer):**

| Uniform           | Type  | Description                          |
|-------------------|-------|--------------------------------------|
| `resolution`      | vec2f | Canvas size in pixels                |
| `center`          | vec2f | View center in fractal coords        |
| `zoom`            | f32   | Current zoom level                   |
| `maxIterations`   | i32   | Iteration limit                      |
| `time`            | f32   | Time in seconds (for animations)     |
| `colorOffset`     | f32   | Color cycle offset                   |
| `fractalType`     | i32   | Fractal type (0–3)                   |
| `juliaC`          | vec2f | Julia set constant (for Julia types) |
| `hdrEnabled`      | i32   | Whether HDR output is active         |
| `hdrBrightnessBias`| f32  | Brightness curve adjustment (-1 to +1)|
| `paletteType`     | i32   | 0 = cosine, 1 = gradient             |
| `isMonotonic`     | i32   | Whether palette is monotonic         |
| `paletteA/B/C/D`  | vec3f | Cosine palette parameters            |
| `gradientC1–C5`   | vec3f | Gradient color stops                 |

**Fractal Types:**

| Value | Name               | Formula                                   |
|-------|--------------------|-------------------------------------------|
| 0     | Mandelbrot         | z = z² + c                                |
| 1     | Burning Ship       | z = (\|Re(z)\| + i\|Im(z)\|)² + c         |
| 2     | Julia              | z = z² + c (z starts at pixel, c fixed)   |
| 3     | Burning Ship Julia | Burning Ship with fixed c                 |

**Algorithm:**

1. Map pixel UV to complex coordinate
2. For Mandelbrot/Burning Ship: z starts at 0, c is pixel position
3. For Julia variants: z starts at pixel position, c is fixed constant
4. Iterate z = z² + c (with absolute value step for Burning Ship variants) until |z| > 2 or max iterations reached
5. If max iterations reached: pixel is black (in set)
6. Otherwise: compute smooth iteration count for anti-banding
7. Get color from palette (cosine or gradient)
8. Apply HDR brightness curve if HDR enabled
9. Output color (values > 1.0 allowed for HDR)

**HDR Brightness Curves:**

Two separate curves are used based on palette type:

- **Monotonic palettes**: Dark-to-bright journey controlled by HDR brightness
  - Low iterations: very dim (3% → 15%)
  - Mid iterations: moderate (15% → 100%)
  - High iterations: HDR boost (100% → 1000% peak)

- **Cycling palettes**: Stay bright throughout, HDR highlights near boundary
  - Most of image: 85% → 100%
  - Near boundary: HDR boost to peak

The `hdrBrightnessBias` uniform shifts where bright regions appear:
- Positive values: more of image becomes bright
- Negative values: only near-boundary is bright

---

## Data Flow

### User Interaction Flow

```
User Input → InputHandler → ViewState → WebGPUFractalEngine.render()
                                              ↓
                                        Update uniform buffer
                                              ↓
                                        Draw fullscreen triangle
                                              ↓
                                        Fragment shader computes
                                        each pixel in parallel
```

### Render Loop

```
requestAnimationFrame loop
       ↓
WebGPUFractalEngine.render()
       ↓
┌────────────────────────────────┐
│ Update uniform buffer          │
│ - View state (center, zoom)    │
│ - Fractal params               │
│ - Palette params               │
│ - HDR settings                 │
└────────────────────────────────┘
       ↓
┌────────────────────────────────┐
│ Execute render pass            │
│ - Draw fullscreen triangle     │
│ - Fragment shader computes     │
│   fractal + color + HDR        │
└────────────────────────────────┘
```

---

## Performance Considerations

### Implemented Optimizations

- **GPU computation**: All fractal math runs in parallel on GPU
- **No branching in shader**: Palette parameters passed as uniforms instead of palette index
- **Fullscreen triangle**: More efficient than fullscreen quad (3 vertices vs 6)
- **High-DPI support**: Canvas resolution matches device pixel ratio
- **Discrete GPU preference**: Requests high-performance GPU when available
- **HDR via extended tone mapping**: No post-process pass needed for HDR

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
├── main.ts                        # Application entry point
├── types.ts                       # TypeScript type definitions
├── bookmark/
│   ├── BookmarkManager.ts         # URL-based state sharing
│   └── famousLocations.ts         # Curated famous fractal spots (keys 1-9)
├── controls/
│   ├── InputHandler.ts            # Mouse, touch, keyboard events
│   └── ViewState.ts               # Pan/zoom state management
├── fractal/
│   └── WebGPUFractalEngine.ts     # Central orchestrator
└── renderer/
    ├── WebGPURenderer.ts          # WebGPU context and HDR config
    ├── Palettes.ts                # Color palette definitions
    └── shaders/
        └── mandelbrot.wgsl        # WGSL shader (fractal + HDR)
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

| Browser        | Minimum Version | Notes                        |
|----------------|-----------------|------------------------------|
| Chrome         | 113+            | Full support                 |
| Edge           | 113+            | Full support                 |
| Firefox        | Nightly         | Requires WebGPU flag enabled |
| Safari         | —               | WebGPU in development        |

**HDR Support:**

HDR rendering requires both WebGPU support and an HDR-capable display. The app detects HDR via `matchMedia('(dynamic-range: high)')` and auto-enables extended tone mapping when available.

---

_"Documentation complete. I'll update this when the implementation changes."_
_— Jennifer Simms_
