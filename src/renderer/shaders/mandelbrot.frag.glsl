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
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - 0.5;
  uv.x *= aspect;
  vec2 c = u_center + uv / u_zoom;

  vec2 z = vec2(0.0);
  int iterations = 0;
  for (int i = 0; i < 4096; i++) {
    if (i >= u_maxIterations) break;
    float zMagSq = dot(z, z);
    if (zMagSq > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    iterations++;
  }

  if (iterations >= u_maxIterations) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));
    float logZoom = log(max(1.0, u_zoom));
    float zoomFactor = clamp(logZoom / 12.0, 0.0, 1.0);
    float lowCut = mix(28.0, 0.0, zoomFactor);
    float span = max(1.0, float(u_maxIterations) - lowCut);
    float t = clamp((smoothIter - lowCut) / span, 0.0, 1.0);
    t = pow(t, mix(0.88, 1.0, zoomFactor));
    vec3 colorAEff = mix(u_colorA * 0.45, u_colorA, zoomFactor);
    vec3 color = mix(colorAEff, u_colorB, t);
    float edgeGlow = smoothstep(0.4, 1.0, t);
    vec3 edgeColor = vec3(0.5) + 0.5 * vec3(
      sin(u_time * 0.5),
      sin(u_time * 0.5 + 2.094),
      sin(u_time * 0.5 + 4.189)
    );
    edgeColor = max(edgeColor, vec3(0.7));
    color = mix(color, edgeColor, edgeGlow * 0.8);
    color *= 1.0 + 0.5 * edgeGlow * edgeGlow;
    fragColor = vec4(min(color, vec3(1.0)), 1.0);
  }
}
