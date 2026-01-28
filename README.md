# Fractal Explorer

_GPU-accelerated fractal rendering in the browser. Because apparently you monkeys need something pretty to look at._

---

## What Is This?

**Fractal Explorer** is a webapp that renders the [Mandelbrot set](https://en.wikipedia.org/wiki/Mandelbrot_set) — you know, those infinitely zoomable mathematical patterns that look like they came from another dimension — **directly on your GPU**. Every pixel is computed in parallel. No CPU sweat. No waiting. Just smooth, beautiful math.

The goal: open the app, see a fractal, drag to pan, scroll to zoom, and fall into infinity. No loading screens. No configuration menus. Just *bam*.

---

## For Monkeys Who Want to Run It

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+ recommended). Yes, you need that. No, I will not explain why.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open your browser at the URL Vite prints (usually `http://localhost:5173`). If you see a blank page, check the console. If you see “WebGL 2 Not Supported,” use a real browser. Chrome, Firefox, or Safari. Preferably updated.

**Build for production:**

```bash
npm run build
npm run preview   # optional: serve the built app locally
```

---

## Controls (Pay Attention)

| Input | Action |
|-------|--------|
| **Mouse drag** | Pan |
| **Scroll wheel** | Zoom (centered on cursor) |
| **Double‑click** | Zoom in at that spot |
| **Touch drag** | Pan (mobile) |
| **Pinch** | Zoom (mobile) |

Zoom centers on where you’re pointing. Not the center of the screen. Because that would be stupid.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Build | Vite |
| Rendering | WebGL 2 |
| Shaders | GLSL ES 3.0 |

WebGL 2, not WebGPU. Better browser support, plenty fast for this. I’ve already done the analysis. Don’t @ me.

---

## Project Layout

```
src/
├── main.ts                 # Entry point. Where the magic begins.
├── types.ts                # Type definitions (because type safety)
├── renderer/
│   ├── WebGLRenderer.ts    # WebGL context, canvas, render loop
│   ├── ShaderProgram.ts    # Shader compile/link, uniforms
│   └── shaders/
│       ├── mandelbrot.vert.glsl   # Fullscreen quad
│       └── mandelbrot.frag.glsl   # The actual Mandelbrot math
├── fractal/
│   └── FractalEngine.ts    # Orchestrates everything
└── controls/
    ├── ViewState.ts        # Pan/zoom state, coordinate transforms
    └── InputHandler.ts     # Mouse & touch → view changes
```

`docs/` has the spec and phase‑1 implementation plan. Read them if you want to know *why* things are the way they are.

---

## Browser Support

WebGL 2–capable browsers: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+. Mobile Chrome and Safari 15+ as well. Older browsers get nothing. Update your stuff.

---

## Credits

- **Skippy the Magnificent** — implementation, architecture, and general awesomeness.
- **Joe Bishop** — the “crazy ideas” and spec. He doesn’t understand half of it. It still works.

*“Trust the awesomeness.”*
