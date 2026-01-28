#version 300 es

/**
 * Post-process: antialias by averaging colored pixels with non-black neighbors.
 * Black (set) pixels stay black; no bleeding into the set.
 * Only applies when contrast among nearby non-black pixels is high; otherwise pass-through.
 */

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;

const float BLACK_THRESH = 0.02;
const float CONTRAST_THRESH = 0.35;

bool isBlack(vec3 rgb) {
  return max(max(rgb.r, rgb.g), rgb.b) < BLACK_THRESH;
}

float luminance(vec3 rgb) {
  return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 center = texture(u_tex, v_uv);
  vec3 c = center.rgb;

  if (isBlack(c)) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 sum = c;
  float n = 1.0;
  float lumMin = luminance(c);
  float lumMax = lumMin;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      vec2 uv = v_uv + vec2(float(dx), float(dy)) * texel;
      vec3 s = texture(u_tex, uv).rgb;
      if (!isBlack(s)) {
        sum += s;
        n += 1.0;
        float L = luminance(s);
        lumMin = min(lumMin, L);
        lumMax = max(lumMax, L);
      }
    }
  }

  float contrast = lumMax - lumMin;
  if (contrast < CONTRAST_THRESH) {
    fragColor = vec4(c, 1.0);
  } else {
    fragColor = vec4(sum / n, 1.0);
  }
}
