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
uniform vec3 u_colorA;          // Color scheme start
uniform vec3 u_colorB;          // Color scheme end
uniform float u_time;           // Time in seconds (for color rotation)

void main() {
  // Convert UV coordinates (0-1) to fractal coordinates
  // Use aspect ratio so the fractal isn't stretched on non-square canvases
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - 0.5;
  uv.x *= aspect;
  vec2 c = u_center + uv / u_zoom;
  
  // Mandelbrot iteration: z = z² + c
  vec2 z = vec2(0.0);
  int iterations = 0;
  
  // Iterate until escape or max iterations
  for (int i = 0; i < 256; i++) {
    if (i >= u_maxIterations) break;
    
    // Check if escaped (|z| > 2)
    float zMagSq = dot(z, z);
    if (zMagSq > 4.0) break;
    
    // z = z² + c
    z = vec2(
      z.x * z.x - z.y * z.y + c.x,
      2.0 * z.x * z.y + c.y
    );
    
    iterations++;
  }
  
  // Smooth coloring using iteration count
  // If we hit max iterations, we're in the set (black)
  if (iterations >= u_maxIterations) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    // Smooth escape time for better coloring
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));
    
    // Zoom factor: 0 = zoomed out, 1 = zoomed in (log scale)
    float logZoom = log(max(1.0, u_zoom));
    float zoomFactor = clamp(logZoom / 12.0, 0.0, 1.0);
    
    // At low zoom: low-cut pushes quick-escape pixels to t=0 (dark), stretch gradient over boundary
    float lowCut = mix(28.0, 0.0, zoomFactor);
    float span = max(1.0, float(u_maxIterations) - lowCut);
    float t = clamp((smoothIter - lowCut) / span, 0.0, 1.0);
    
    // Slight contrast boost at low zoom so the set boundary pops more
    t = pow(t, mix(0.88, 1.0, zoomFactor));
    
    // Darker colorA when zoomed out (escape region darker)
    vec3 colorAEff = mix(u_colorA * 0.45, u_colorA, zoomFactor);
    
    vec3 color = mix(colorAEff, u_colorB, t);
    
    // Bright edge: blend toward a luminous highlight near the set boundary
    float edgeGlow = smoothstep(0.4, 1.0, t);
    vec3 edgeColor = vec3(0.5) + 0.5 * vec3(
      sin(u_time * 0.5),
      sin(u_time * 0.5 + 2.094),
      sin(u_time * 0.5 + 4.189)
    );
    edgeColor = max(edgeColor, vec3(0.7));  // keep it bright
    color = mix(color, edgeColor, edgeGlow * 0.8);
    
    // Extra brightness ramp at the edge so it pops
    color *= 1.0 + 0.5 * edgeGlow * edgeGlow;
    color = min(color, vec3(1.0));
    
    fragColor = vec4(color, 1.0);
  }
}
