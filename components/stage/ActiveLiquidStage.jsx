"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getFilmStock } from "../../lib/cinema/presets";
import { renderShotFrame } from "../../lib/cinema/renderer";
import { LockIcon, MicIcon, TicketIcon } from "../icons/CinemaIcons";

const MAX_ORBS = 6;

// Balanced orbital anchors around the central submerged photographic eye cluster
const ORBIT_SLOTS = [
  { x: 0.17, y: 0.28, r: 0.105, phase: 0.4 },
  { x: 0.83, y: 0.27, r: 0.115, phase: 1.9 },
  { x: 0.19, y: 0.72, r: 0.098, phase: 3.3 },
  { x: 0.81, y: 0.71, r: 0.108, phase: 4.8 },
  { x: 0.5, y: 0.16, r: 0.086, phase: 2.5 },
  { x: 0.5, y: 0.84, r: 0.09, phase: 5.4 },
];

const SIM_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Real 2D wave-equation GPU ping-pong simulation with continuous pointer wake + click shockwaves
const SIM_FRAG = `
  varying vec2 vUv;

  uniform sampler2D uCurr;
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform vec2 uMouse;
  uniform vec2 uPrevMouse;
  uniform float uMouseSpeed;
  uniform float uDamping;
  uniform float uDropActive;
  uniform vec2 uDropPos;
  uniform float uDropStrength;
  uniform float uSignedByte;

  float decodeH(vec4 c) {
    return uSignedByte > 0.5 ? (c.r * 2.0 - 1.0) : c.r;
  }

  vec4 encodeH(float h) {
    float v = uSignedByte > 0.5 ? clamp(h * 0.5 + 0.5, 0.0, 1.0) : clamp(h, -1.5, 1.5);
    return vec4(v, v, v, 1.0);
  }

  // Distance from point p to segment a-b for silky uninterrupted mouse wake
  float distToSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    float cL = decodeH(texture2D(uCurr, vUv - vec2(uTexel.x, 0.0)));
    float cR = decodeH(texture2D(uCurr, vUv + vec2(uTexel.x, 0.0)));
    float cD = decodeH(texture2D(uCurr, vUv - vec2(0.0, uTexel.y)));
    float cU = decodeH(texture2D(uCurr, vUv + vec2(0.0, uTexel.y)));
    float prev = decodeH(texture2D(uPrev, vUv));

    // Standard 2D wave equation: next = avg(neighbors)*2 - prev
    float next = ((cL + cR + cD + cU) * 0.5 - prev) * uDamping;

    // Continuous smooth cursor wake
    if (uMouseSpeed > 0.0004) {
      float d = distToSegment(vUv, uPrevMouse, uMouse);
      float radius = 0.022 + min(0.018, uMouseSpeed * 0.45);
      float impulse = exp(-(d * d) / (radius * radius)) * min(0.68, uMouseSpeed * 6.5);
      next += impulse;
    }

    // Discrete shockwave drop (ambient droplet / orb hover / click pulse)
    if (uDropActive > 0.5) {
      float dd = length(vUv - uDropPos);
      float r = 0.026;
      next += exp(-(dd * dd) / (r * r)) * uDropStrength;
    }

    // Gentle edge absorption to avoid harsh wall reflections
    vec2 edge = min(vUv, 1.0 - vUv);
    float edgeMask = smoothstep(0.0, 0.04, min(edge.x, edge.y));
    next *= mix(0.88, 1.0, edgeMask);

    gl_FragColor = encodeH(next);
  }
`;

// Active Theory inspired liquid refraction + chromatic RGB dispersion + specular caustics + submerged eye + floating dream orbs
const RENDER_FRAG = `
  varying vec2 vUv;

  uniform sampler2D uHeight;
  uniform sampler2D uEyeTex;
  uniform sampler2D uOrb0;
  uniform sampler2D uOrb1;
  uniform sampler2D uOrb2;
  uniform sampler2D uOrb3;
  uniform sampler2D uOrb4;
  uniform sampler2D uOrb5;

  uniform vec2 uResolution;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform vec2 uGaze;       // normalized -1..1 target gaze offset
  uniform float uBlink;     // 0 = closed, 1 = open
  uniform float uSignedByte;
  uniform int uOrbCount;
  uniform vec4 uOrbGeom[6]; // xy = center uv (y-up), z = radius (in min-dim), w = hover 0..1

  float sampleH(vec2 uv) {
    float r = texture2D(uHeight, clamp(uv, 0.002, 0.998)).r;
    return uSignedByte > 0.5 ? (r * 2.0 - 1.0) : r;
  }

  vec3 sampleOrbTex(int idx, vec2 uv) {
    if (idx == 0) return texture2D(uOrb0, uv).rgb;
    if (idx == 1) return texture2D(uOrb1, uv).rgb;
    if (idx == 2) return texture2D(uOrb2, uv).rgb;
    if (idx == 3) return texture2D(uOrb3, uv).rgb;
    if (idx == 4) return texture2D(uOrb4, uv).rgb;
    return texture2D(uOrb5, uv).rgb;
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 uv = vUv;

    // Surface gradient from live GPU wave height-field
    float hL = sampleH(uv - vec2(uTexel.x * 1.4, 0.0));
    float hR = sampleH(uv + vec2(uTexel.x * 1.4, 0.0));
    float hD = sampleH(uv - vec2(0.0, uTexel.y * 1.4));
    float hU = sampleH(uv + vec2(0.0, uTexel.y * 1.4));
    vec2 grad = vec2(hR - hL, hU - hD);
    float waveAmp = length(grad);

    // 3D liquid surface normal
    vec3 normal = normalize(vec3(-grad.x * 3.4, -grad.y * 3.4, 1.0));

    // Deep obsidian velvet water background with subtle atmospheric depth
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
    float radialDist = length(centered);
    vec3 bg = mix(vec3(0.028, 0.042, 0.052), vec3(0.008, 0.011, 0.014), smoothstep(0.0, 0.85, radialDist));

    // Subtle dark architectural whisper lines refracted by the liquid surface
    vec2 gridUv = (uv + grad * 0.065) * vec2(aspect * 10.0, 10.0);
    vec2 gDist = abs(fract(gridUv - 0.5) - 0.5);
    float gridMask = 1.0 - smoothstep(0.0, 0.016, min(gDist.x, gDist.y));
    bg += vec3(0.32, 0.52, 0.58) * gridMask * (0.02 + waveAmp * 0.14);

    // ---------- 1. SUBMERGED PHOTOGRAPHIC EYE CLUSTER (CENTER) ----------
    vec2 eyeRel = (uv - vec2(0.5, 0.51)) * vec2(aspect, 1.0);
    float eyeBoxW = 0.54;
    float eyeBoxH = 0.36;
    vec2 eyeUv = vec2(eyeRel.x / eyeBoxW + 0.5, eyeRel.y / eyeBoxH + 0.5);

    // Organic radial iris-tracking shift (stronger near center iris, softer at outer socket)
    float irisPull = exp(-dot(eyeRel * vec2(2.6, 3.4), eyeRel * vec2(2.6, 3.4)));
    vec2 gazeShift = -uGaze * (0.022 + 0.052 * irisPull);

    // Liquid refraction + RGB dispersion on submerged eyes
    vec2 refractUv = eyeUv + gazeShift + grad * 0.095;
    float eyeMask = smoothstep(0.54, 0.12, length((eyeUv - 0.5) * vec2(1.05, 1.15)));

    // Organic curved eyelid blink occlusion over the photographic eye
    float lidCurve = 0.5 * uBlink * cos(clamp((eyeUv.x - 0.5) * 3.1, -1.57, 1.57));
    float distFromLidCenter = abs(eyeUv.y - 0.51);
    float lidOpenMask = smoothstep(lidCurve + 0.045, max(0.0, lidCurve - 0.03), distFromLidCenter);
    // Soft blink keeps surrounding peripheral shadow intact while closing the eyes cleanly
    float blinkFactor = mix(1.0, lidOpenMask, smoothstep(0.5, 0.14, length(eyeUv - 0.5)));

    if (eyeMask > 0.001) {
      vec2 disp = grad * 0.018;
      float eR = texture2D(uEyeTex, clamp(refractUv + disp * 1.35, 0.0, 1.0)).r;
      float eG = texture2D(uEyeTex, clamp(refractUv, 0.0, 1.0)).g;
      float eB = texture2D(uEyeTex, clamp(refractUv - disp * 1.35, 0.0, 1.0)).b;
      vec3 eyeCol = vec3(eR, eG, eB);

      // Softly suppress the tiny crosshair mark in the lower-right of the source eye photo
      float artifactDist = length(eyeUv - vec2(0.655, 0.305));
      eyeCol *= mix(0.28, 1.0, smoothstep(0.02, 0.11, artifactDist));

      // Filmic grade: rich dark shadow, luminous amber-crimson iris glints
      eyeCol = pow(max(eyeCol, 0.0), vec3(1.12)) * 1.16;
      bg = mix(bg, eyeCol, eyeMask * blinkFactor * 0.88);
    }

    // ---------- 2. FLOATING LIQUID 35MM DREAM ORBS ----------
    vec3 color = bg;
    for (int i = 0; i < 6; i++) {
      if (i >= uOrbCount) break;
      vec4 g = uOrbGeom[i];
      vec2 center = g.xy;
      float radius = g.z * (1.0 + g.w * 0.18);
      vec2 dVec = (uv - center) * vec2(aspect, 1.0);
      float dist = length(dVec);

      // Soft atmospheric dream glow bleeding into the dark water around each orb
      float halo = exp(-(dist * dist) / max(radius * radius * 2.2, 0.0001));
      vec3 haloTint = mix(vec3(0.45, 0.68, 0.74), vec3(0.86, 0.65, 0.40), mod(float(i), 2.0));
      color += haloTint * halo * (0.065 + g.w * 0.11 + waveAmp * 0.18);

      // Concentric liquid ripple ring hint on hover
      if (g.w > 0.01) {
        float ring1 = exp(-pow((dist - radius * 1.18) * 140.0, 2.0));
        float ring2 = exp(-pow((dist - radius * 1.36) * 110.0, 2.0));
        color += vec3(0.74, 0.88, 0.92) * (ring1 * 0.22 + ring2 * 0.09) * g.w;
      }

      if (dist < radius * 1.06) {
        vec2 local = dVec / radius; // -1..1 inside orb
        float r2 = dot(local, local);
        // Subtle optical spherical lens refraction + gentle Ken Burns float + live GPU water distortion
        float bulge = 1.0 - 0.18 * (1.0 - min(r2, 1.0));
        vec2 slowDrift = vec2(sin(uTime * 0.22 + float(i) * 1.7), cos(uTime * 0.18 + float(i))) * 0.025;
        vec2 baseOrbUv = local * bulge * 0.5 + 0.5 + slowDrift;
        vec2 refractedOrbUv = baseOrbUv + grad * (0.14 + g.w * 0.04);

        // Chromatic RGB split along water wave slope (Active Theory signature!)
        vec2 chroma = grad * 0.026 + local * (0.008 * r2);
        float cR = sampleOrbTex(i, clamp(refractedOrbUv + chroma, 0.01, 0.99)).r;
        float cG = sampleOrbTex(i, clamp(refractedOrbUv, 0.01, 0.99)).g;
        float cB = sampleOrbTex(i, clamp(refractedOrbUv - chroma, 0.01, 0.99)).b;
        vec3 orbCol = vec3(cR, cG, cB);

        // Edge optical vignette so orb melts organically into dark water (zero tacky sticker outline!)
        float innerVignette = smoothstep(1.04, 0.52, length(local));
        orbCol *= mix(0.32, 1.08 + g.w * 0.12, innerVignette);

        // Crisp subtle Fresnel optical rim
        float rim = smoothstep(0.78, 0.98, length(local)) * smoothstep(1.03, 0.96, length(local));
        orbCol += mix(vec3(0.65, 0.84, 0.88), vec3(0.95, 0.82, 0.64), g.w) * rim * (0.28 + g.w * 0.35);

        float alpha = smoothstep(1.02, 0.92, length(local));
        color = mix(color, orbCol, alpha);
      }
    }

    // ---------- 3. LIQUID SPECULAR CAUSTICS & CHROMATIC WATER SHIMMER ----------
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 light1 = normalize(vec3(-0.35, 0.55, 0.78));
    vec3 light2 = normalize(vec3(0.45, -0.35, 0.82));
    vec3 half1 = normalize(light1 + viewDir);
    vec3 half2 = normalize(light2 + viewDir);

    float spec1 = pow(max(dot(normal, half1), 0.0), 42.0);
    float spec2 = pow(max(dot(normal, half2), 0.0), 28.0);

    // Iridescent liquid highlight along wave crests
    vec3 liquidSpec = vec3(0.76, 0.92, 0.98) * spec1 * 0.55
                    + vec3(0.92, 0.72, 0.52) * spec2 * 0.32;
    color += liquidSpec * smoothstep(0.008, 0.18, waveAmp);

    // Subtle iridescent edge dispersion along active wave ridges
    color.r += smoothstep(0.04, 0.25, grad.x) * 0.055;
    color.b += smoothstep(0.04, 0.25, -grad.x) * 0.065;

    // Filmic analog vignette & ultra-fine 35mm grain
    float vig = smoothstep(1.22, 0.32, radialDist);
    color *= mix(0.46, 1.0, vig);

    float grain = (hash12(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.026;
    color += grain;

    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`;

function createFallbackOrbTexture(dream) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    renderShotFrame(ctx, 512, 512, dream?.shots?.[0], dream?.filmStock || "lumon-35mm", 0.38, {
      showSubtitle: false,
      letterbox: false,
      cameraZoom: false,
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export default function ActiveLiquidStage({
  dreams,
  onSelectDream,
  onOpenTicket,
  onFocusDreamChange,
}) {
  const containerRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const hoveredIdxRef = useRef(-1);
  const dropTriggerRef = useRef(null);

  const visibleDreams = useMemo(() => dreams.slice(0, MAX_ORBS), [dreams]);
  const visibleDreamsRef = useRef(visibleDreams);

  useEffect(() => {
    visibleDreamsRef.current = visibleDreams;
  }, [visibleDreams]);

  useEffect(() => {
    hoveredIdxRef.current = hoveredIdx;
    const focused = hoveredIdx >= 0 ? visibleDreams[hoveredIdx] || null : null;
    onFocusDreamChange?.(focused);
    if (hoveredIdx >= 0 && dropTriggerRef.current) {
      const slot = ORBIT_SLOTS[hoveredIdx];
      if (slot) {
        dropTriggerRef.current(slot.x, 1 - slot.y, 0.52);
      }
    }
  }, [hoveredIdx, visibleDreams, onFocusDreamChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    // Detect 16-bit half-float FBO support (native on WebGL2 macOS/Windows/iOS)
    const supportsHalfFloat =
      renderer.capabilities.isWebGL2 &&
      Boolean(
        renderer.extensions.get("EXT_color_buffer_float") ||
          renderer.extensions.get("EXT_color_buffer_half_float"),
      );
    const rtType = supportsHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const signedByteFlag = supportsHalfFloat ? 0.0 : 1.0;

    const simRes = 256;
    const rtOpts = {
      type: rtType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const rts = [
      new THREE.WebGLRenderTarget(simRes, simRes, rtOpts),
      new THREE.WebGLRenderTarget(simRes, simRes, rtOpts),
      new THREE.WebGLRenderTarget(simRes, simRes, rtOpts),
    ];

    // Initialize neutral flat water height
    const clearColor = supportsHalfFloat ? new THREE.Color(0, 0, 0) : new THREE.Color(0.5, 0.5, 0.5);
    rts.forEach((rt) => {
      renderer.setRenderTarget(rt);
      renderer.setClearColor(clearColor, 1);
      renderer.clear();
    });
    renderer.setRenderTarget(null);

    const simMat = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT,
      fragmentShader: SIM_FRAG,
      uniforms: {
        uCurr: { value: rts[1].texture },
        uPrev: { value: rts[0].texture },
        uTexel: { value: new THREE.Vector2(1 / simRes, 1 / simRes) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseSpeed: { value: 0 },
        uDamping: { value: 0.974 },
        uDropActive: { value: 0 },
        uDropPos: { value: new THREE.Vector2(0.5, 0.5) },
        uDropStrength: { value: 0.4 },
        uSignedByte: { value: signedByteFlag },
      },
    });
    const simScene = new THREE.Scene();
    simScene.add(new THREE.Mesh(quadGeo, simMat));

    const texLoader = new THREE.TextureLoader();
    const eyeTex = texLoader.load("/assets/dream-lab/eye-cluster.png");
    eyeTex.minFilter = THREE.LinearFilter;
    eyeTex.magFilter = THREE.LinearFilter;

    // Build initial fallback textures synchronously; load photographic stills safely after renderMat init
    let disposed = false;
    const ownedTextures = [eyeTex];
    const orbTextures = Array.from({ length: MAX_ORBS }).map((_, idx) => {
      const dream = visibleDreamsRef.current[idx];
      const fallback = createFallbackOrbTexture(dream || null);
      ownedTextures.push(fallback);
      return fallback;
    });

    const initialOrbGeoms = Array.from({ length: MAX_ORBS }).map((_, idx) => {
      const s = ORBIT_SLOTS[idx];
      return new THREE.Vector4(s.x, 1 - s.y, s.r, 0);
    });

    const renderMat = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT,
      fragmentShader: RENDER_FRAG,
      uniforms: {
        uHeight: { value: rts[1].texture },
        uEyeTex: { value: eyeTex },
        uOrb0: { value: orbTextures[0] },
        uOrb1: { value: orbTextures[1] },
        uOrb2: { value: orbTextures[2] },
        uOrb3: { value: orbTextures[3] },
        uOrb4: { value: orbTextures[4] },
        uOrb5: { value: orbTextures[5] },
        uResolution: {
          value: new THREE.Vector2(container.clientWidth, container.clientHeight),
        },
        uTexel: { value: new THREE.Vector2(1 / simRes, 1 / simRes) },
        uTime: { value: 0 },
        uGaze: { value: new THREE.Vector2(0, 0) },
        uBlink: { value: 1 },
        uSignedByte: { value: signedByteFlag },
        uOrbCount: { value: visibleDreamsRef.current.length },
        uOrbGeom: { value: initialOrbGeoms },
      },
    });
    const renderScene = new THREE.Scene();
    renderScene.add(new THREE.Mesh(quadGeo, renderMat));

    // Upgrade orbs with real 35mm photographic textures
    visibleDreamsRef.current.forEach((dream, idx) => {
      if (idx >= MAX_ORBS) return;
      const imgUrl = dream?.shots?.[0]?.imageUrl;
      if (!imgUrl) return;
      texLoader.load(imgUrl, (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.minFilter = THREE.LinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        ownedTextures.push(loaded);
        renderMat.uniforms[`uOrb${idx}`].value = loaded;
      });
    });

    // Pointer, hover lerp, blink, and ambient droplet state
    const mouse = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, moved: false };
    const gaze = { x: 0, y: 0 };
    const hoverLerp = new Float32Array(MAX_ORBS);
    const pendingDrop = { active: false, x: 0.5, y: 0.5, strength: 0.4 };
    const blink = { open: 1, phase: "idle", timer: 2.2 };

    dropTriggerRef.current = (x, y, strength = 0.55) => {
      pendingDrop.active = true;
      pendingDrop.x = x;
      pendingDrop.y = y;
      pendingDrop.strength = strength;
    };

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const ny = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      if (!mouse.moved) {
        mouse.prevX = nx;
        mouse.prevY = ny;
      }
      mouse.x = Math.max(0, Math.min(1, nx));
      mouse.y = Math.max(0, Math.min(1, ny));
      mouse.moved = true;
    };

    const onPointerDown = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const ny = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      pendingDrop.active = true;
      pendingDrop.x = nx;
      pendingDrop.y = ny;
      pendingDrop.strength = 0.85;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      renderMat.uniforms.uResolution.value.set(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // Gentle opening liquid ripple on mount
    pendingDrop.active = true;
    pendingDrop.x = 0.5;
    pendingDrop.y = 0.5;
    pendingDrop.strength = 0.5;

    let ringIndex = 0;
    let ambientDropTimer = 2.8;
    let rafId = 0;
    let lastTs = performance.now();

    const animate = (ts) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const time = ts / 1000;

      // Occasional gentle ambient droplet so dark water breathes naturally
      ambientDropTimer -= dt;
      if (ambientDropTimer <= 0 && !pendingDrop.active) {
        pendingDrop.active = true;
        pendingDrop.x = 0.22 + Math.random() * 0.56;
        pendingDrop.y = 0.22 + Math.random() * 0.56;
        pendingDrop.strength = 0.28;
        ambientDropTimer = 3.2 + Math.random() * 3.4;
      }

      // Compute pointer speed for liquid wake
      const dx = mouse.x - mouse.prevX;
      const dy = mouse.y - mouse.prevY;
      const speed = Math.hypot(dx, dy);

      const prevRt = rts[ringIndex % 3];
      const currRt = rts[(ringIndex + 1) % 3];
      const nextRt = rts[(ringIndex + 2) % 3];

      simMat.uniforms.uPrev.value = prevRt.texture;
      simMat.uniforms.uCurr.value = currRt.texture;
      simMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      simMat.uniforms.uPrevMouse.value.set(mouse.prevX, mouse.prevY);
      simMat.uniforms.uMouseSpeed.value = speed;
      simMat.uniforms.uDropActive.value = pendingDrop.active ? 1.0 : 0.0;
      simMat.uniforms.uDropPos.value.set(pendingDrop.x, pendingDrop.y);
      simMat.uniforms.uDropStrength.value = pendingDrop.strength;

      renderer.setRenderTarget(nextRt);
      renderer.render(simScene, camera);
      renderer.setRenderTarget(null);

      pendingDrop.active = false;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      ringIndex += 1;

      // Smooth eye gaze toward hovered orb or live cursor
      const hIdx = hoveredIdxRef.current;
      let targetGazeX = (mouse.x - 0.5) * 2.0;
      let targetGazeY = (mouse.y - 0.5) * 2.0;
      if (hIdx >= 0 && ORBIT_SLOTS[hIdx]) {
        targetGazeX = (ORBIT_SLOTS[hIdx].x - 0.5) * 2.0;
        targetGazeY = (1 - ORBIT_SLOTS[hIdx].y - 0.5) * 2.0;
      }
      gaze.x += (targetGazeX - gaze.x) * Math.min(1, dt * 5.2);
      gaze.y += (targetGazeY - gaze.y) * Math.min(1, dt * 5.2);

      // Organic asynchronous eyelid blink state machine
      blink.timer -= dt;
      if (blink.phase === "idle" && blink.timer <= 0) {
        blink.phase = "closing";
      } else if (blink.phase === "closing") {
        blink.open -= dt * 10.5;
        if (blink.open <= 0.04) {
          blink.open = 0.04;
          blink.phase = "closed";
          blink.timer = 0.06;
        }
      } else if (blink.phase === "closed" && blink.timer <= 0) {
        blink.phase = "opening";
      } else if (blink.phase === "opening") {
        blink.open += dt * 7.2;
        if (blink.open >= 1) {
          blink.open = 1;
          blink.phase = "idle";
          blink.timer = 3.2 + Math.random() * 4.5;
        }
      }

      // Smoothly animate orb float positions & hover scale
      const geoms = renderMat.uniforms.uOrbGeom.value;
      for (let i = 0; i < MAX_ORBS; i += 1) {
        const s = ORBIT_SLOTS[i];
        const targetHover = i === hIdx ? 1 : 0;
        hoverLerp[i] += (targetHover - hoverLerp[i]) * Math.min(1, dt * 6.5);
        const floatX = Math.sin(time * 0.45 + s.phase) * 0.008;
        const floatY = Math.cos(time * 0.38 + s.phase * 1.3) * 0.011;
        geoms[i].set(s.x + floatX, 1 - s.y + floatY, s.r, hoverLerp[i]);
      }

      renderMat.uniforms.uHeight.value = nextRt.texture;
      renderMat.uniforms.uTime.value = time;
      renderMat.uniforms.uGaze.value.set(gaze.x, gaze.y);
      renderMat.uniforms.uBlink.value = blink.open;
      renderMat.uniforms.uOrbCount.value = visibleDreamsRef.current.length;

      renderer.render(renderScene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      ro.disconnect();
      rts.forEach((rt) => rt.dispose());
      quadGeo.dispose();
      simMat.dispose();
      renderMat.dispose();
      ownedTextures.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [visibleDreams]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden select-none">
      {/* Accessible invisible hit-targets aligned with GPU-rendered liquid dream orbs */}
      {visibleDreams.map((dream, idx) => {
        const slot = ORBIT_SLOTS[idx];
        const active = hoveredIdx === idx;
        const stock = getFilmStock(dream.filmStock);

        return (
          <div
            key={dream.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.r * 200}vmin`,
              height: `${slot.r * 200}vmin`,
              zIndex: active ? 25 : 15,
            }}
          >
            <button
              type="button"
              aria-label={`放映梦境：${dream.title}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? -1 : prev))}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx((prev) => (prev === idx ? -1 : prev))}
              onClick={() => {
                if (dropTriggerRef.current) {
                  dropTriggerRef.current(slot.x, 1 - slot.y, 1.0);
                }
                onSelectDream(dream);
              }}
              className="h-full w-full cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-1 focus-visible:ring-[#EAE5DC]/60"
            />

            {/* Minimal whisper caption that ONLY fades in softly on hover */}
            <div
              className={`pointer-events-none absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 whitespace-nowrap text-center transition-all duration-500 ${
                active ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 font-reel text-[9px] tracking-[0.22em] text-[#D9B684]">
                <span>{dream.reelCode}</span>
                <span>·</span>
                <span>{stock.code}</span>
                {dream.hasVoice && <MicIcon className="h-2.5 w-2.5" />}
                {dream.visibility === "private" && <LockIcon className="h-2.5 w-2.5" />}
              </div>
              <div className="mt-0.5 font-cinema text-sm tracking-[0.08em] text-[#F5F0E7]">
                {dream.title}
              </div>
            </div>

            {active && (
              <button
                type="button"
                title="生成 35mm 纪念票根"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTicket(dream);
                }}
                className="absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full border border-[#F5F0E7]/25 bg-[#06090C]/75 text-[#E5C596] backdrop-blur-sm transition hover:border-[#E5C596] hover:bg-[#0B1116]"
              >
                <TicketIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
