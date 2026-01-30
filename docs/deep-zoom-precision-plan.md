# Deep Zoom: Precision & Performance Plan

_"Look, I don't know how this stuff works, but what if we..."_
_- Colonel Joe Bishop_

_"Oh for the love of floating-point… yes, some of Joe's ramblings are actually
worth implementing."_
_- Skippy the Magnificent_

---

## Executive Summary

At low zoom levels the Mandelbrot renderer performs well. As users zoom in,
rendering slows and eventually pixels become blocky due to floating-point
precision limits. This document captures a set of ideas (originating from
"ground-pounder" brainstorming) and their technical translation into a
prioritized implementation plan for deep-zoom precision and performance.

---

## The Problem

| Symptom                            | Cause                                                                |
|------------------------------------|----------------------------------------------------------------------|
| Slower rendering at deep zoom      | More iterations needed; same work everywhere                         |
| Pixels become "Lego blocks"        | 32-bit float precision exhausted; coordinates lose relative accuracy |
| Feels unresponsive at extreme zoom | Single-pass, fixed iteration budget; no progressive feedback         |

**Goal:** Stay fast at deep zoom, keep pixels sharp, and avoid melting the user's
device.

---

## Joe's Ideas (Summarized)

These are the "crazy ideas" from a non-technical perspective—*what* we want,
not *how* to do it:

1. **Re-center the universe** — When zooming way in, treat the zoom target as
   the new origin so we're not measuring from some distant global reference.
2. **Zoom handoff** — Use different "playbooks" at different zoom levels
   instead of one strategy everywhere.
3. **Progressive focus-in** — Show a quick, slightly blurry pass first, then
   refine the interesting bits (like binoculars coming into focus).
4. **Only fight where the enemy is** — Don't waste effort on regions that are
   off-screen or obviously boring.
5. **Adaptive iteration budget** — Easy pixels get fewer "thinking steps";
   hard pixels near the boundary get more.
6. **Reuse earlier work** — When zooming deeper into a spot we've already seen,
   remember and reuse some of that work instead of starting from scratch.
7. **Tourist destinations** — At extreme zoom, gently steer users toward
   pre-tuned "interesting" locations that render well.
8. **Precision boost mode** — At some zoom threshold, switch to a more
   expensive but accurate mode (like calling in special forces).
9. **Multi-stage zoom illusion** — At some depth, freeze a high-res layer and
   composite a local "zoom" on top to fake infinite depth.

---

## Technical Translation & Prioritization

Skippy's assessment: which ideas map to real techniques and in what order to
implement them.

### Tier 1: Must implement first

#### 1. Re-centered / view-local coordinates + zoom-band handoff

**Joe's version:** "Re-center the universe" + "different playbooks per zoom."

**Technical approach:**

- **View-local coordinates:** Express each point as  
  `z = z_center + Δ`  
  where `z_center` is the zoom target (maintained in high precision on the CPU)
  and `Δ` is a small offset sent to the GPU.
- **CPU:** Maintain `center` and `scale` in high precision (e.g. `big.js`,
  `decimal.js`, or double-double). Update these when the user pans/zooms.
- **GPU:** Receives only small local coordinates; 32-bit floats then retain
  useful precision and blocky pixels are delayed or avoided.
- **Zoom handoff:** Below a zoom threshold use the current "global" shader path;
  above it use a different coordinate mapping and possibly different iteration
 / escape logic (re-centered, normalized).

**Deliverables:**

- High-precision view state (center + scale) in CPU.
- Shader(s) that accept local offset/scale and compute `c` from `z_center + Δ`.
- Clear zoom-band thresholds and code paths for "normal" vs "deep" zoom.

---

#### 2. Adaptive iteration budget and tile-based refinement

**Joe's version:** "Adaptive iteration budget per pixel" + "only fight where
the enemy is."

**Technical approach:**

- Start with a **lower base max-iteration** for a first pass.
- **Refine where it matters:**
  - Pixels near the boundary (escape time near `maxIter`).
  - Tiles with high variance in escape time vs neighbors.
- **Early bailout:** Keep existing early-exit; add or tune heuristics so
  "boring" regions do minimal work.
- **Tile-level culling:** If a tile's corners (or sample) all escape quickly
  and similarly, fill or skip refinement for that tile.

**Deliverables:**

- Configurable base vs refined `maxIter` (and possibly multiple passes).
- Tile-based complexity metric and a refinement pass that increases iterations
  only where needed.
- Optional: separate "edge detection" or variance pass to drive refinement.

---

### Tier 2: High value, implement next

#### 3. Precision-boost mode at extreme zoom

**Joe's version:** "Hidden precision boost" when user zooms past a threshold.

**Technical approach:**

- Below a zoom threshold: current GPU path (with Tier 1 re-centering).
- Above threshold:
  - **Option A:** Same GPU path but with stronger normalization/re-centering
    and formulas that reduce catastrophic cancellation.
  - **Option B:** For very deep zoom, a **CPU path** with arbitrary-precision
    math, rendering at lower resolution and upscaling, or as a progressive
    background tile job.

**Deliverables:**

- Zoom threshold and a clear "precision mode" flag or code path.
- Either improved GPU path (Option A) or a small CPU renderer (Option B) with
  progressive/async UX so the app doesn't appear to freeze.

---

#### 4. Progressive multi-pass rendering

**Joe's version:** "Progressive focus-in" — quick pass first, then refine.

**Technical approach:**

- **Pass 1:** Low `maxIter`, possibly reduced resolution; render full view
  quickly.
- **Pass 2+:** Increase `maxIter` in bands and/or refine tiles with high
  complexity or user focus (e.g. center, mouse position).
- Entirely GPU-driven; CPU only schedules passes and updates uniforms.

**Deliverables:**

- Multi-pass render loop with configurable iteration bands.
- Optional: focus region (e.g. center or cursor) gets refinement priority.
- UI remains responsive (no freeze) during refinement.

---

### Tier 3: Standard optimizations (weave in)

#### 5. "Only fight where the enemy is" — view culling and tile heuristics

**Technical approach:**

- Ensure only **visible** pixels are computed (screen → complex mapping;
  likely already correct).
- Use **tile heuristics:** e.g. if a tile is uniformly "easy" (fast escape,
  low variance), spend less or no extra work there; if high variance or
  boundary-like, apply adaptive iteration (Tier 1) and refinement.

**Deliverables:**

- Tile-based quick classification (e.g. all-escaped, uniform, boundary).
- Integration with adaptive iteration and progressive passes.

---

### Tier 4: Advanced / later

#### 6. Perturbation / reference-orbit reuse

**Joe's version:** "Reuse earlier work" when zooming deeper into the same area.

**Technical approach:**

- Pick a **reference point** in the view (e.g. center). Compute its orbit in
  high precision (CPU or precomputed).
- On GPU, for each pixel compute only the **perturbation** from that orbit;
  use 32-bit floats for deltas. This extends effective precision at deep zoom.
- More engineering effort; implement after Tier 1 and 2 are in place.

**Deliverables:**

- Reference orbit computation (high precision).
- Shader that takes reference data and computes perturbed iterations.
- Correct handling of pan/zoom (reference point and orbit updates).

---

#### 7. "Tourist destinations" (UX polish)

**Joe's version:** At extreme zoom, snap or suggest pre-defined interesting
locations.

**Technical approach:**

- Curated list of (center, zoom, maybe maxIter) for known-good deep zoom
  spots.
- When user is very deep, optionally:
  - Suggest "Jump to interesting spot," or
  - Slight snap of pan/zoom to nearest curated location.
- Does not fix precision; improves UX and can steer users away from worst-case
  regions.

**Deliverables:**

- Data structure and list of "tourist" views.
- Optional UI: suggestions or gentle snapping when zoom exceeds a threshold.

---

## Implementation Order

| Phase | Focus                                  | Outcomes                                                                |
|-------|----------------------------------------|-------------------------------------------------------------------------|
| **1** | Re-centered coordinates + zoom handoff | Sharp pixels at deeper zoom; clear split between normal/deep zoom paths |
| **2** | Adaptive iteration + tile refinement   | Faster rendering; same or better quality where it matters               |
| **3** | Precision-boost mode                   | Usable rendering at extreme zoom (GPU and/or CPU path)                  |
| **4** | Progressive multi-pass                 | Snappy first frame; refined image without freezing                      |
| **5** | Tile culling and heuristics            | Less wasted work; better integration with 1–4                           |
| **6** | Perturbation (optional)                | Maximum deep zoom with reused orbit work                                |
| **7** | Tourist destinations (optional)        | UX polish at extreme zoom                                               |

---

## Success Criteria (Deep Zoom)

- [ ] At zoom levels that currently produce blocky pixels, the image remains
  sharp (re-centered coordinates and zoom handoff).
- [ ] Frame time at deep zoom improves or stays acceptable (adaptive
  iteration and culling).
- [ ] First frame appears quickly; refinement completes without blocking
  interaction (progressive passes).
- [ ] Optional: extreme zoom (e.g. beyond float32 comfort zone) still
  produces a plausible image (precision mode or perturbation).

---

## Related Documents

- [architecture.md](./architecture.md) — Current system architecture
- [fractal-webapp-spec.md](./fractal-webapp-spec.md) — Product and feature spec
- [phase-1-implementation-plan.md](./phase-1-implementation-plan.md) — Phase 1 plan (✅ complete)

---

## Document Info

| Field        | Value                                                                                 |
|--------------|---------------------------------------------------------------------------------------|
| Version      | 1.1                                                                                   |
| Status       | Plan; ready for implementation (Phase 1 complete, this is post-Phase 1)               |
| Last Updated | January 2026                                                                          |
| Origins      | Joe Bishop (ideas); Skippy the Magnificent (technical translation and prioritization) |

---

_"I don't know how to make it work. I just know that it SHOULD work. Figure it
out, Skippy."_  
_- Joe Bishop_

_"Fine. Tier 1 first. Then we talk."_  
_- Skippy the Magnificent_
