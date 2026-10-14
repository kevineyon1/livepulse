// Latar WebGL (three.js): gradien noise yang mengalir dengan palet hasil ukur
// dashboard (crimson → plum → teal) + partikel yang naik pelan seperti "like"
// di LIVE. Bereaksi terhadap keadaan aplikasi:
//   setEnergy(0..1)  → saat OCR berjalan, aliran & partikel makin cepat, ada pita scan
//   setMood(status)  → setelah analisa, warna condong ke status kesehatan live
// Fallback: tanpa WebGL / reduce-motion → gradien CSS statis di #fx.

import * as THREE from 'three';
import { gsap } from 'gsap';

const MOOD = {
  good: '#2f9e6f',
  ok: '#3b6aa8',
  warning: '#b7832a',
  critical: '#b0263f',
};

const noop = { setEnergy() {}, setMood() {}, pulse() {} };
let api = noop;

export const fx = {
  setEnergy: (v) => api.setEnergy(v),
  setMood: (s) => api.setMood(s),
  pulse: () => api.pulse(),
};

const BG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BG_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uEnergy;
  uniform vec3 uC1, uC2, uC3, uBg, uMood;
  uniform float uMoodAmt;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float t = uTime * (0.035 + uEnergy * 0.12);
    vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 3.1));
    float n = fbm(p * 1.7 + q * 1.7 + t * 0.5);
    // diagonal seperti kartu GMV di dashboard: crimson kiri-atas → teal kanan-bawah
    float diag = clamp(uv.x * 0.62 + (1.0 - uv.y) * 0.38 + (n - 0.5) * 0.6, 0.0, 1.0);
    vec3 col = mix(uC1, uC2, smoothstep(0.0, 0.55, diag));
    col = mix(col, uC3, smoothstep(0.45, 1.0, diag));
    col = mix(col, uMood, uMoodAmt * smoothstep(0.25, 0.85, n));
    float vig = smoothstep(1.3, 0.15, length(p * vec2(0.85, 1.15)));
    float glow = smoothstep(0.3, 0.95, n) * 0.65 + 0.2;
    col = mix(uBg, col, vig * glow * (0.5 + uEnergy * 0.3));
    float band = exp(-pow((uv.y - fract(uTime * 0.22)) * 16.0, 2.0)) * uEnergy * 0.22;
    col += vec3(0.27, 0.67, 0.67) * band;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PT_VERT = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime, uEnergy, uPx, uAspect;
  varying float vAlpha;
  varying float vHue;
  void main() {
    float speed = 0.018 + aSeed.z * 0.035;
    float y = mod(aSeed.y + uTime * speed * (1.0 + uEnergy * 5.0), 2.4) - 1.2;
    float x = aSeed.x + sin(uTime * 0.35 + aSeed.z * 20.0) * 0.035 / uAspect;
    gl_Position = vec4(x, y, 0.0, 1.0);
    gl_PointSize = uPx * (1.2 + aSeed.z * 3.2) * (1.0 + uEnergy * 0.6);
    vAlpha = smoothstep(-1.2, -0.5, y) * (1.0 - smoothstep(0.5, 1.2, y)) * (0.18 + aSeed.z * 0.55);
    vHue = aSeed.z;
  }
`;

const PT_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uMood;
  uniform float uMoodAmt;
  varying float vAlpha;
  varying float vHue;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(0.62, 0.95, 0.94), vec3(1.0, 0.58, 0.68), step(0.72, vHue));
    col = mix(col, uMood, uMoodAmt * 0.6);
    gl_FragColor = vec4(col, a * a * vAlpha);
  }
`;

export function initScene(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return noop;
  }
  if (!renderer.getContext()) return noop;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0c0d0e, 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const c = (hex) => new THREE.Color(hex);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uEnergy: { value: 0 },
    uC1: { value: c('#8b3143') },
    uC2: { value: c('#5c333c') },
    uC3: { value: c('#304745') },
    uBg: { value: c('#0c0d0e') },
    uMood: { value: c('#45abaa') },
    uMoodAmt: { value: 0 },
    uPx: { value: 3 * dpr },
    uAspect: { value: 1 },
  };

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms, depthTest: false, depthWrite: false }),
  );
  scene.add(bg);

  const COUNT = window.innerWidth < 700 ? 160 : 380;
  const seeds = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    seeds[i * 3] = Math.random() * 2.2 - 1.1;
    seeds[i * 3 + 1] = Math.random() * 2.4;
    seeds[i * 3 + 2] = Math.random() ** 2.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({ vertexShader: PT_VERT, fragmentShader: PT_FRAG, uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  points.frustumCulled = false;
  scene.add(points);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
    uniforms.uAspect.value = w / h;
  };
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  renderer.setAnimationLoop(() => {
    if (!running) return;
    uniforms.uTime.value += Math.min(clock.getDelta(), 0.05);
    renderer.render(scene, camera);
  });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    clock.getDelta();
  });

  api = {
    setEnergy(v) {
      gsap.to(uniforms.uEnergy, { value: v, duration: 1.2, ease: 'power2.out', overwrite: true });
    },
    setMood(status) {
      const hex = MOOD[status];
      if (!hex) {
        gsap.to(uniforms.uMoodAmt, { value: 0, duration: 1.5 });
        return;
      }
      const target = c(hex);
      gsap.to(uniforms.uMood.value, { r: target.r, g: target.g, b: target.b, duration: 1.6, ease: 'power2.inOut' });
      gsap.to(uniforms.uMoodAmt, { value: 0.55, duration: 1.6, ease: 'power2.inOut' });
    },
    pulse() {
      gsap.fromTo(uniforms.uEnergy, { value: 1 }, { value: 0, duration: 1.6, ease: 'power2.out' });
    },
  };
  return api;
}
