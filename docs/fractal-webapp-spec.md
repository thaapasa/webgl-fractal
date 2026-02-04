# Fractal Explorer - Project Specification

_"Look, I don't understand half of this stuff, but I know what I want it to DO."_
_- Colonel Joe Bishop_

---

## Implementation Status

> Last reviewed February 4, 2026

| Feature                             | Status                                                                     |
|-------------------------------------|----------------------------------------------------------------------------|
| Immediate beautiful fractal on load | ✅ Done                                                                     |
| Zooming (mouse, touch, pinch)       | ✅ Done                                                                     |
| Panning (mouse, touch)              | ✅ Done                                                                     |
| Smooth 60 FPS rendering             | ✅ Done                                                                     |
| Color schemes                       | ✅ Done (19 palettes: 12 cosine + 7 gradient!)                              |
| Multiple fractal types              | ✅ Done (10 base types + Julia variants = 20 total)                         |
| Julia sets                          | ✅ Done (with interactive picker mode!)                                     |
| URL bookmarking                     | ✅ Done (shareable links + 9 famous locations)                              |
| Tourist mode                        | 🔲 Not yet                                                                 |
| Offline support                     | 🔲 Not yet                                                                 |

---

## The Big Picture

We're building a webapp where people can explore fractals - those infinitely
complex, endlessly zooming mathematical patterns that look like they came from
another dimension. The key is that it needs to be FAST and SMOOTH, which
apparently means we're going to make the graphics card do all the heavy
lifting.

I'm told we need something called "WebAssembly" for the number crunching and
"GPU shaders" for the actual drawing. I have no idea what any of that means,
but Skippy will figure it out.

---

## What The User Should Experience

### First Impression

When someone opens this app, they should immediately see something beautiful.
No loading screens, no configuration menus, no "please wait while we
initialize." Just BAM - a gorgeous fractal filling the screen, slowly animating
or pulsing with color. Make them say "whoa."

### Core Interactions

1. **Zooming** - Click or pinch to zoom in. Forever. The deeper you go, the
   more detail appears. It should feel like falling into infinity.

2. **Panning** - Drag to move around. Find new interesting areas. The fractal
   should extend in all directions.

3. **Smooth as butter** - Whatever's happening under the hood, it needs to feel
   responsive. No stuttering, no waiting. If the math can't keep up, figure out
   some trick to make it feel instant anyway.

### The "Crazy Ideas" Section

Okay, Skippy's probably going to tell me these are impossible, but hear me out:

#### Idea 1: "Tourist Mode"

What if the app could automatically find interesting spots? Like, zoom into
cool-looking areas on its own, giving people a guided tour of the fractal while
they sit back and watch. Kind of like a screensaver, but interactive - tap
anywhere to take over and explore yourself.

#### Idea 2: "Bookmark the Infinite"

People should be able to save specific locations they find interesting. Copy a
link, share it with friends, come back later to the exact same spot. Yeah, I
know the fractal is infinite - figure out a way to remember where we are.

#### Idea 3: "Color Moods"

Different color schemes that change the whole vibe. Neon cyberpunk. Sunset
warmth. Deep ocean. Black and white film noir. Maybe even let people make their
own? And smooth transitions between them - no jarring switches.

#### Idea 4: "What Am I Looking At?"

Some kind of indicator that tells people how deep they've zoomed. "You are 10
million times deeper than the original view" or whatever. Make the scale
comprehensible. Maybe compare it to real things - "at this zoom level, if the
starting view was Earth, you're now looking at a single atom."

#### Idea 5: "Split Screen Compare"

Show two different fractals side by side, or the same fractal with different
color schemes. Zoom them together. I don't know why anyone would want this, but
it seems cool.

---

## Types of Fractals (I Think?)

From what I understand, there are different kinds of these things:

1. **Mandelbrot Set** - The classic one. The one that looks like a bug with
   infinite detail around the edges.

2. **Julia Sets** - Related to Mandelbrot somehow? Each point in Mandelbrot
   corresponds to a different Julia set? I don't get it, but apparently they're
   beautiful.

3. **Burning Ship** - Mandelbrot's angry cousin. More angular, more aggressive
   looking.

4. **Others?** - Are there more? Can we add more later? The architecture
   should let us plug in new types without rewriting everything.

---

## Performance Requirements

I'm going to translate these into non-technical terms:

- **"60 FPS"** - It needs to feel like real life. Smooth motion. No choppiness.

- **"Works on phones"** - Not just fancy computers with expensive graphics
  cards. Regular people with regular phones should see something impressive.

- **"Graceful degradation"** - If someone's device can't handle the full
  experience, give them something simpler that still looks good. Don't just
  crash or show a blank screen.

- **"Deep zoom capability"** - People should be able to zoom in really, REALLY
  far. I'm told there are limits based on number precision? Skippy, figure out
  how to push those limits as far as possible.

---

## User Interface Design Principles

### Minimalist

The fractal is the star. The UI should be nearly invisible until you need it.
Maybe controls that fade in when you hover/tap near the edges?

### Discoverable

People should be able to figure out basic controls without a tutorial. Zoom,
pan, maybe change colors. Intuitive.

### Progressive Complexity

Basic users get basic controls. Power users can dig into advanced settings if
they want. Don't overwhelm newcomers with options.

### Mobile-First

More people browse on phones than computers these days. Touch controls should
feel native, not like an afterthought.

---

## Technical Stuff I Don't Understand But Skippy Needs To Know

- WebAssembly for computation (apparently this is faster than regular web
  stuff?)
- WebGPU or WebGL for rendering (making the graphics card do the work)
- Runs entirely in the browser (no installation, no plugins)
- Should work offline once loaded (that service worker thing?)
- No backend server needed for basic functionality

---

## Success Criteria

How do we know if we've succeeded?

1. **My mom could use it** - If she can open it and have fun without calling me
   for help, we've won.

2. **"How is this running in a browser?"** - People should be impressed by the
   performance.

3. **Shareable moments** - People will want to share cool spots they find with
   friends.

4. **Time sink** - Users lose track of time exploring. That's the goal.

---

## Implementation Phases

### Phase 1: Proof of Concept ✅ COMPLETE

- ✅ One fractal type (Mandelbrot) rendering on GPU
- ✅ Basic zoom and pan
- ✅ Works in modern browsers
- ✅ Proves the concept is viable
- ✅ **Bonus:** 12 color palettes, auto-scaling iterations, antialiasing

### Phase 2: Core Experience

- Smooth performance at 60 FPS ✅ (already done)
- Touch controls for mobile ✅ (already done)
- Multiple color schemes ✅ (already done)
- Share/bookmark functionality ✅ (URL sharing + famous locations)

### Phase 3: Polish and Expand

- Multiple fractal types (Julia sets, Burning Ship) ✅ (all 4 types done)
- Tourist mode auto-exploration 🔲
- Advanced settings for power users ✅ (help overlay, iteration controls)
- Offline support 🔲

### Phase 4: The Extra Mile

- Split screen comparisons
- Custom color scheme creation
- Whatever other crazy ideas we come up with

---

## Open Questions

Things I don't have answers for yet:

1. What browsers do we need to support? Just modern ones, or do we need
   fallbacks for older browsers?

2. How do we handle the "number precision" limits for deep zooming? Is there a
   way to use bigger numbers?

3. Should there be any kind of account system for saving favorites, or just
   local storage?

4. Are there legal considerations with fractal algorithms? Can we use whatever
   math we want?

---

## Final Thoughts

Look, I know this sounds ambitious. Skippy's probably reading this and
preparing a 47-point list of why each of my ideas is impossible or stupid. But
that's fine - that's how we work.

The goal is simple: make something beautiful that people can get lost in. Make
the math invisible and the experience magical. Everything else is details.

Let's figure it out.

---

_"I don't know how to make it work. I just know that it SHOULD work. Figure it
out, Skippy."_

---

**Document Version:** 1.2
**Author:** Colonel Joe Bishop (ideas) + Skippy (implementation)
**Status:** Phase 1 & 2 complete, Phase 3 in progress
**Last Updated:** January 2026
**Related:**
- [architecture.md](./architecture.md) — System architecture
- [phase-1-implementation-plan.md](./phase-1-implementation-plan.md) — Phase 1 plan (complete)
- [deep-zoom-precision-plan.md](./deep-zoom-precision-plan.md) — Precision roadmap
