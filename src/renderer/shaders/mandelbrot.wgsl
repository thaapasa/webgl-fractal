// WebGPU Shader for Mandelbrot Set with HDR support
// WGSL (WebGPU Shading Language)

struct Uniforms {
  resolution: vec2f,
  center: vec2f,
  zoom: f32,
  maxIterations: i32,
  time: f32,
  paletteIndex: i32,
  colorOffset: f32,
  fractalType: i32,
  juliaC: vec2f,
  hdrEnabled: i32,
  hdrPeakNits: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Fullscreen triangle (more efficient than quad)
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = (pos[vertexIndex] + 1.0) * 0.5;
  return output;
}

// Cosine palette
fn palette(t: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> vec3f {
  return a + b * cos(6.28318 * (c * t + d));
}

// HDR brightness curve for MONOTONIC palettes (dark-to-bright journey)
// These palettes use brightness to show iteration depth
fn hdrBrightnessCurveMonotonic(normalized: f32, peakMultiplier: f32) -> f32 {
  let LOW_END = 0.05;
  let MID_START = 0.30;
  let HIGH_START = 0.60;

  if (normalized < LOW_END) {
    // Very dim at start
    let t = normalized / LOW_END;
    return mix(0.0, 0.15, sqrt(t));
  } else if (normalized < MID_START) {
    // Rise to moderate
    let t = (normalized - LOW_END) / (MID_START - LOW_END);
    return mix(0.15, 0.5, t);
  } else if (normalized < HIGH_START) {
    // Rise to standard
    let t = (normalized - MID_START) / (HIGH_START - MID_START);
    return mix(0.5, 1.0, t);
  } else {
    // HDR boost zone - ramp to peak brightness
    let t = (normalized - HIGH_START) / (1.0 - HIGH_START);
    let eased = pow(t, 1.1);
    return mix(1.0, peakMultiplier, eased);
  }
}

// HDR brightness curve for CYCLING palettes (bright throughout with HDR highlights)
// These palettes rely on color variation, so keep them bright
fn hdrBrightnessCurveCycling(normalized: f32, peakMultiplier: f32) -> f32 {
  let HIGH_START = 0.70;

  if (normalized < HIGH_START) {
    // Keep bright throughout - slight variation for depth
    let t = normalized / HIGH_START;
    return mix(0.85, 1.0, t);
  } else {
    // HDR boost near the boundary - this is where the magic happens
    let t = (normalized - HIGH_START) / (1.0 - HIGH_START);
    let eased = pow(t, 1.2);
    return mix(1.0, peakMultiplier, eased);
  }
}

// ============================================
// SDR Palettes - Use RGB luminosity for depth
// Dark colors for low iterations, bright for high
// ============================================

fn getColorSDR(t_in: f32, paletteIdx: i32, isCycling: bool) -> vec3f {
  var t = t_in;
  if (isCycling) {
    t = fract(t);
  } else {
    t = clamp(t, 0.0, 1.0);
  }

  if (paletteIdx == 0) {
    // Rainbow
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0), vec3f(0.0, 0.33, 0.67));
  } else if (paletteIdx == 1) {
    // Blue journey - dark to bright
    let c1 = vec3f(0.02, 0.01, 0.08);
    let c2 = vec3f(0.05, 0.15, 0.25);
    let c3 = vec3f(0.1, 0.4, 0.5);
    let c4 = vec3f(0.3, 0.6, 0.8);
    let c5 = vec3f(0.7, 0.9, 1.0);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 2) {
    // Gold journey
    let c1 = vec3f(0.04, 0.02, 0.01);
    let c2 = vec3f(0.2, 0.08, 0.02);
    let c3 = vec3f(0.5, 0.25, 0.05);
    let c4 = vec3f(0.85, 0.6, 0.2);
    let c5 = vec3f(1.0, 0.95, 0.7);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 3) {
    // Grayscale
    let c1 = vec3f(0.01, 0.01, 0.03);
    let c2 = vec3f(0.15, 0.15, 0.17);
    let c3 = vec3f(0.45, 0.45, 0.45);
    let c4 = vec3f(0.75, 0.74, 0.72);
    let c5 = vec3f(1.0, 0.98, 0.95);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 4) {
    // Fire
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0, 1.0, 0.5), vec3f(0.0, 0.1, 0.2));
  } else if (paletteIdx == 5) {
    // Ice
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0, 0.7, 0.4), vec3f(0.0, 0.15, 0.20));
  } else if (paletteIdx == 6) {
    // Sepia
    let c1 = vec3f(0.03, 0.02, 0.01);
    let c2 = vec3f(0.15, 0.08, 0.03);
    let c3 = vec3f(0.4, 0.25, 0.12);
    let c4 = vec3f(0.7, 0.55, 0.35);
    let c5 = vec3f(1.0, 0.95, 0.85);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 7) {
    // Ocean
    let c1 = vec3f(0.0, 0.02, 0.05);
    let c2 = vec3f(0.02, 0.08, 0.2);
    let c3 = vec3f(0.05, 0.3, 0.4);
    let c4 = vec3f(0.2, 0.6, 0.6);
    let c5 = vec3f(0.6, 0.95, 0.9);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 8) {
    // Purple
    let c1 = vec3f(0.03, 0.01, 0.06);
    let c2 = vec3f(0.15, 0.05, 0.25);
    let c3 = vec3f(0.4, 0.15, 0.5);
    let c4 = vec3f(0.7, 0.4, 0.75);
    let c5 = vec3f(0.95, 0.8, 1.0);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 9) {
    // Forest
    let c1 = vec3f(0.02, 0.03, 0.01);
    let c2 = vec3f(0.05, 0.12, 0.04);
    let c3 = vec3f(0.1, 0.35, 0.15);
    let c4 = vec3f(0.3, 0.65, 0.3);
    let c5 = vec3f(0.7, 0.95, 0.6);
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 10) {
    // Sunset
    return palette(t, vec3f(0.5, 0.3, 0.2), vec3f(0.5, 0.4, 0.3), vec3f(1.0, 1.0, 0.5), vec3f(0.0, 0.1, 0.2));
  } else {
    // Electric
    return palette(t, vec3f(0.5), vec3f(0.6), vec3f(1.0), vec3f(0.3, 0.2, 0.2));
  }
}

// ============================================
// HDR Palettes - Fully saturated bright colors
// Brightness controlled by HDR nits curve, not RGB
// ============================================

fn getColorHDR(t_in: f32, paletteIdx: i32, isCycling: bool) -> vec3f {
  var t = t_in;
  if (isCycling) {
    t = fract(t);
  } else {
    t = clamp(t, 0.0, 1.0);
  }

  // All HDR palettes use fully saturated, bright colors
  // The HDR brightness curve handles the luminosity

  if (paletteIdx == 0) {
    // Rainbow HDR - fully vibrant cycling
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0), vec3f(0.0, 0.33, 0.67));
  } else if (paletteIdx == 1) {
    // Blue HDR - rich saturated blues
    let c1 = vec3f(0.2, 0.4, 1.0);   // electric blue
    let c2 = vec3f(0.3, 0.6, 1.0);   // bright blue
    let c3 = vec3f(0.4, 0.8, 1.0);   // cyan-blue
    let c4 = vec3f(0.6, 0.9, 1.0);   // light cyan
    let c5 = vec3f(0.85, 1.0, 1.0);  // bright cyan-white
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 2) {
    // Gold HDR - brilliant golds and yellows
    let c1 = vec3f(1.0, 0.5, 0.1);   // orange
    let c2 = vec3f(1.0, 0.65, 0.2);  // gold-orange
    let c3 = vec3f(1.0, 0.8, 0.3);   // gold
    let c4 = vec3f(1.0, 0.9, 0.5);   // bright gold
    let c5 = vec3f(1.0, 1.0, 0.8);   // pale yellow
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 3) {
    // Grayscale HDR - pure whites
    return vec3f(1.0, 1.0, 1.0);  // Just white - HDR curve does the work
  } else if (paletteIdx == 4) {
    // Fire HDR - cycling cosine palette (same as SDR)
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0, 1.0, 0.5), vec3f(0.0, 0.1, 0.2));
  } else if (paletteIdx == 5) {
    // Ice HDR - cycling cosine palette (same as SDR)
    return palette(t, vec3f(0.5), vec3f(0.5), vec3f(1.0, 0.7, 0.4), vec3f(0.0, 0.15, 0.20));
  } else if (paletteIdx == 6) {
    // Sepia HDR - warm creams and tans
    let c1 = vec3f(1.0, 0.7, 0.4);   // tan
    let c2 = vec3f(1.0, 0.8, 0.55);  // light tan
    let c3 = vec3f(1.0, 0.88, 0.7);  // cream
    let c4 = vec3f(1.0, 0.95, 0.85); // pale cream
    let c5 = vec3f(1.0, 1.0, 0.95);  // warm white
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 7) {
    // Ocean HDR - vivid teals and aquas
    let c1 = vec3f(0.1, 0.8, 0.8);   // teal
    let c2 = vec3f(0.2, 0.9, 0.85);  // aqua
    let c3 = vec3f(0.4, 0.95, 0.9);  // light aqua
    let c4 = vec3f(0.65, 1.0, 0.95); // pale aqua
    let c5 = vec3f(0.85, 1.0, 1.0);  // bright cyan-white
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 8) {
    // Purple HDR - vivid magentas and purples
    let c1 = vec3f(0.8, 0.2, 1.0);   // vivid purple
    let c2 = vec3f(0.85, 0.4, 1.0);  // magenta-purple
    let c3 = vec3f(0.9, 0.6, 1.0);   // orchid
    let c4 = vec3f(0.95, 0.8, 1.0);  // light lavender
    let c5 = vec3f(1.0, 0.95, 1.0);  // pale pink-white
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 9) {
    // Forest HDR - vivid greens
    let c1 = vec3f(0.3, 1.0, 0.2);   // bright green
    let c2 = vec3f(0.5, 1.0, 0.4);   // lime
    let c3 = vec3f(0.7, 1.0, 0.55);  // yellow-green
    let c4 = vec3f(0.85, 1.0, 0.75); // pale lime
    let c5 = vec3f(0.95, 1.0, 0.9);  // pale green-white
    if (t < 0.25) { return mix(c1, c2, t * 4.0); }
    else if (t < 0.5) { return mix(c2, c3, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c3, c4, (t - 0.5) * 4.0); }
    else { return mix(c4, c5, (t - 0.75) * 4.0); }
  } else if (paletteIdx == 10) {
    // Sunset HDR - cycling cosine palette (same as SDR)
    return palette(t, vec3f(0.5, 0.3, 0.2), vec3f(0.5, 0.4, 0.3), vec3f(1.0, 1.0, 0.5), vec3f(0.0, 0.1, 0.2));
  } else {
    // Electric HDR - cycling cosine palette (same as SDR)
    return palette(t, vec3f(0.5), vec3f(0.6), vec3f(1.0), vec3f(0.3, 0.2, 0.2));
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let aspect = u.resolution.x / u.resolution.y;
  var uv = input.uv - 0.5;
  uv.x *= aspect;
  let pos = u.center + uv / u.zoom;

  // Setup for fractal type
  var z: vec2f;
  var c: vec2f;
  let isJulia = (u.fractalType == 2 || u.fractalType == 3);
  let isBurningShip = (u.fractalType == 1 || u.fractalType == 3);

  if (isJulia) {
    z = pos;
    c = u.juliaC;
  } else {
    z = vec2f(0.0);
    c = pos;
  }

  var iterations = 0;
  let maxIter = u.maxIterations;

  for (var i = 0; i < 65536; i++) {
    if (i >= maxIter) { break; }
    let zMagSq = dot(z, z);
    if (zMagSq > 4.0) { break; }

    if (isBurningShip) {
      z = vec2f(abs(z.x), -abs(z.y));
    }
    z = vec2f(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    iterations++;
  }

  if (iterations >= maxIter) {
    // Inside the set - pure black
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }

  // Smooth iteration count
  let smoothIter = f32(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));
  let normalized = smoothIter / f32(maxIter);

  // Determine palette type
  let isMonotonic = (u.paletteIndex >= 1 && u.paletteIndex <= 3) ||
                    (u.paletteIndex >= 6 && u.paletteIndex <= 9);

  var t: f32;
  if (isMonotonic) {
    t = normalized + u.colorOffset;
  } else {
    let numCycles = 8.0;
    t = normalized * numCycles + u.colorOffset;
  }

  // Use different palettes for HDR vs SDR
  if (u.hdrEnabled != 0) {
    // HDR: bright saturated colors + HDR brightness curve
    var color = getColorHDR(t, u.paletteIndex, !isMonotonic);

    // Apply appropriate HDR brightness curve based on palette type
    let peakMultiplier = u.hdrPeakNits / 100.0;
    var brightnessMult: f32;

    if (isMonotonic) {
      // Monotonic palettes: dark-to-bright journey, HDR shows depth via brightness
      brightnessMult = hdrBrightnessCurveMonotonic(normalized, peakMultiplier);
    } else {
      // Cycling palettes: stay bright throughout, HDR highlights near boundary
      brightnessMult = hdrBrightnessCurveCycling(normalized, peakMultiplier);
    }

    color = color * brightnessMult;

    // Don't clamp - let values > 1.0 be displayed brighter on HDR displays
    return vec4f(color, 1.0);
  } else {
    // SDR: traditional palettes where RGB luminosity shows depth
    var color = getColorSDR(t, u.paletteIndex, !isMonotonic);

    // Add subtle glow near boundary
    let edgeFactor = 1.0 - f32(iterations) / f32(maxIter);
    let glow = pow(edgeFactor, 0.5) * 0.3;
    color = color * (1.0 + glow);

    // Clamp to SDR range
    return vec4f(min(color, vec3f(1.0)), 1.0);
  }
}
