#version 300 es

/**
 * Fragment Shader - Mandelbrot Set Computation
 *
 * "This is where the magic happens. On the GPU. In parallel. For every pixel.
 *  Simultaneously. You're welcome."
 * - Skippy the Magnificent
 */

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;      // Canvas size in pixels
uniform vec2 u_center;          // Current view center in fractal coordinates
uniform float u_zoom;           // Current zoom level
uniform int u_maxIterations;    // Iteration limit (quality vs performance)
uniform float u_time;           // Time in seconds (for animations)
uniform int u_paletteIndex;     // Which color palette to use (0-7)
uniform float u_colorOffset;    // Offset to shift the color cycle

// Attempt at magnificent color palettes using cosine gradients
// Formula: color = a + b * cos(2π * (c * t + d))
// Each palette defined by vec3 a, b, c, d

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int paletteIdx, bool isCycling) {
  // For cycling palettes: wrap t to [0, 1] for repeating
  // For monotonic palettes: clamp t to [0, 1] for single gradient
  if (isCycling) {
    t = fract(t);
  } else {
    t = clamp(t, 0.0, 1.0);
  }

  if (paletteIdx == 0) {
    // Classic rainbow - the psychedelic special
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 1.0, 1.0),
      vec3(0.0, 0.33, 0.67));
  } else if (paletteIdx == 1) {
    // Blue journey - dark indigo -> teal -> cyan -> bright blue-white
    vec3 c1 = vec3(0.02, 0.01, 0.08);  // deep indigo
    vec3 c2 = vec3(0.05, 0.15, 0.25);  // dark teal
    vec3 c3 = vec3(0.1, 0.4, 0.5);     // teal
    vec3 c4 = vec3(0.3, 0.6, 0.8);     // sky blue
    vec3 c5 = vec3(0.7, 0.9, 1.0);     // bright cyan-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 2) {
    // Gold journey - dark brown -> copper -> orange -> gold -> bright yellow
    vec3 c1 = vec3(0.04, 0.02, 0.01);  // near black brown
    vec3 c2 = vec3(0.2, 0.08, 0.02);   // dark copper
    vec3 c3 = vec3(0.5, 0.25, 0.05);   // copper-orange
    vec3 c4 = vec3(0.85, 0.6, 0.2);    // gold
    vec3 c5 = vec3(1.0, 0.95, 0.7);    // bright gold-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 3) {
    // Grayscale with subtle blue tint at shadows, warm at highlights
    vec3 c1 = vec3(0.01, 0.01, 0.03);  // near black, hint of blue
    vec3 c2 = vec3(0.15, 0.15, 0.17);  // dark gray, cool
    vec3 c3 = vec3(0.45, 0.45, 0.45);  // mid gray
    vec3 c4 = vec3(0.75, 0.74, 0.72);  // light gray, hint warm
    vec3 c5 = vec3(1.0, 0.98, 0.95);   // warm white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 4) {
    // Fire - hot hot hot
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 1.0, 0.5),
      vec3(0.0, 0.1, 0.2));
  } else if (paletteIdx == 5) {
    // Ice - cool blues and cyans
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 0.7, 0.4),
      vec3(0.0, 0.15, 0.20));
  } else if (paletteIdx == 6) {
    // Sepia journey - dark brown -> warm brown -> tan -> cream
    vec3 c1 = vec3(0.03, 0.02, 0.01);  // near black
    vec3 c2 = vec3(0.15, 0.08, 0.03);  // dark brown
    vec3 c3 = vec3(0.4, 0.25, 0.12);   // warm brown
    vec3 c4 = vec3(0.7, 0.55, 0.35);   // tan
    vec3 c5 = vec3(1.0, 0.95, 0.85);   // cream white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 7) {
    // Ocean journey - abyss -> deep blue -> teal -> seafoam -> bright
    vec3 c1 = vec3(0.0, 0.02, 0.05);   // abyss
    vec3 c2 = vec3(0.02, 0.08, 0.2);   // deep blue
    vec3 c3 = vec3(0.05, 0.3, 0.4);    // ocean teal
    vec3 c4 = vec3(0.2, 0.6, 0.6);     // seafoam
    vec3 c5 = vec3(0.6, 0.95, 0.9);    // bright aqua
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 8) {
    // Purple journey - dark violet -> purple -> magenta -> pink -> bright
    vec3 c1 = vec3(0.03, 0.01, 0.06);  // near black violet
    vec3 c2 = vec3(0.15, 0.05, 0.25);  // dark purple
    vec3 c3 = vec3(0.4, 0.15, 0.5);    // purple
    vec3 c4 = vec3(0.7, 0.4, 0.75);    // orchid
    vec3 c5 = vec3(0.95, 0.8, 1.0);    // bright pink-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 9) {
    // Forest journey - dark earth -> forest -> emerald -> lime -> bright
    vec3 c1 = vec3(0.02, 0.03, 0.01);  // dark earth
    vec3 c2 = vec3(0.05, 0.12, 0.04);  // dark forest
    vec3 c3 = vec3(0.1, 0.35, 0.15);   // forest green
    vec3 c4 = vec3(0.3, 0.65, 0.3);    // emerald
    vec3 c5 = vec3(0.7, 0.95, 0.6);    // bright lime
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 10) {
    // Sunset - warm oranges to pinks
    return palette(t,
      vec3(0.5, 0.3, 0.2),
      vec3(0.5, 0.4, 0.3),
      vec3(1.0, 1.0, 0.5),
      vec3(0.0, 0.1, 0.2));
  } else {
    // Electric - vibrant neon (the wild one at the end)
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.6, 0.6, 0.6),
      vec3(1.0, 1.0, 1.0),
      vec3(0.3, 0.2, 0.2));
  }
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - 0.5;
  uv.x *= aspect;
  vec2 c = u_center + uv / u_zoom;

  vec2 z = vec2(0.0);
  int iterations = 0;
  // Loop limit must be a compile-time constant in GLSL; 65536 allows high manual overrides
  for (int i = 0; i < 65536; i++) {
    if (i >= u_maxIterations) break;
    float zMagSq = dot(z, z);
    if (zMagSq > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    iterations++;
  }

  if (iterations >= u_maxIterations) {
    // Inside the set - pure black
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    // Smooth iteration count for anti-banding
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));

    // Normalize to [0, 1] based on max iterations
    float normalized = smoothIter / float(u_maxIterations);

    // Determine if this palette is monotonic (single cycle) or cycling (multiple cycles)
    // Monotonic: 1, 2, 3, 6, 7, 8, 9 (Blue, Gold, Grayscale, Sepia, Ocean, Purple, Forest)
    // Cycling: 0, 4, 5, 10, 11 (Rainbow, Fire, Ice, Sunset, Electric)
    bool isMonotonic = (u_paletteIndex >= 1 && u_paletteIndex <= 3) ||
                       (u_paletteIndex >= 6 && u_paletteIndex <= 9);

    float t;
    if (isMonotonic) {
      // Single cycle from 0 to 1 across all iterations
      t = normalized + u_colorOffset;
    } else {
      // Multiple cycles for psychedelic effect (e.g., 8 full cycles)
      float numCycles = 8.0;
      t = normalized * numCycles + u_colorOffset;
    }

    vec3 color = getColor(t, u_paletteIndex, !isMonotonic);

    // Add subtle glow near the boundary
    float edgeFactor = 1.0 - float(iterations) / float(u_maxIterations);
    float glow = pow(edgeFactor, 0.5) * 0.3;
    color = color * (1.0 + glow);

    fragColor = vec4(min(color, vec3(1.0)), 1.0);
  }
}
