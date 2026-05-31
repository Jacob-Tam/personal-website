/*
  Core orb shader. The core is an emissive glowing sphere with a faint blue fresnel rim and
  slow internal turbulence (3D simplex noise modulating brightness), per docs/04 C2. Output is
  HDR (can exceed 1) so the Step 4 bloom pass picks it up; toneMapped is set false on the
  material so the brightness is preserved, and the colorspace chunk handles linear -> sRGB for
  display. NOTE for Step 4: re-verify this against the EffectComposer pipeline (the composer
  does the final color conversion, so the colorspace chunk may need to come out then).
*/

export const coreVertexShader = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const coreFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uEmissive;
  uniform float uNoiseAmp;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;
  uniform float uFresnelPower;
  uniform vec3 uCoreColor;
  uniform vec3 uRimColor;

  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  // Ashima 3D simplex noise (webgl-noise, MIT).
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    float n = snoise(vLocalPos * uNoiseScale + vec3(0.0, 0.0, uTime * uNoiseSpeed));
    float fresnel = pow(1.0 - max(dot(normalize(vNormalV), normalize(vViewDir)), 0.0), uFresnelPower);
    vec3 color = mix(uCoreColor, uRimColor, fresnel);
    float brightness = uEmissive * (1.0 + uNoiseAmp * n);
    gl_FragColor = vec4(color * brightness, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
