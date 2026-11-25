import { getFilmStock } from "./presets";

function hashString(str) {
  let h = 2166136261;
  const input = String(str || "dream");
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGlowOrb(ctx, x, y, radius, color, alpha = 0.7) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSky(ctx, w, h, palette, horizonRatio = 0.62) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(horizonRatio * 0.65, palette.skyMid);
  grad.addColorStop(horizonRatio, palette.skyHorizon);
  grad.addColorStop(1, palette.shadow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawStarsAndDust(ctx, w, h, rand, progress, palette, count = 48) {
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const bx = rand() * w;
    const by = rand() * h * 0.72;
    const r = 0.6 + rand() * 1.9;
    const drift = (rand() - 0.5) * 28 * progress;
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(progress * Math.PI * 2 + i * 1.7));
    ctx.globalAlpha = twinkle * 0.55;
    ctx.fillStyle = i % 4 === 0 ? palette.accent : "#F7F1E6";
    ctx.beginPath();
    ctx.arc((bx + drift + w) % w, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawOceanMoonlight(ctx, w, h, palette, rand, p) {
  const horizon = h * 0.56;
  drawSky(ctx, w, h, palette, 0.56);
  drawStarsAndDust(ctx, w, h, rand, p, palette, 55);

  const moonX = w * (0.62 - p * 0.04);
  const moonY = h * (0.28 + Math.sin(p * Math.PI) * 0.02);
  drawGlowOrb(ctx, moonX, moonY, w * 0.22, palette.accent, 0.28);
  ctx.save();
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(moonX, moonY, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Water body
  const waterGrad = ctx.createLinearGradient(0, horizon, 0, h);
  waterGrad.addColorStop(0, palette.skyMid);
  waterGrad.addColorStop(0.35, palette.shadow);
  waterGrad.addColorStop(1, "#040404");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Shimmering moonlight reflections
  ctx.save();
  for (let i = 0; i < 42; i += 1) {
    const t = i / 42;
    const y = horizon + t * t * (h - horizon) * 0.94;
    const spread = 12 + t * w * 0.22;
    const wave = Math.sin(p * Math.PI * 4 + i * 0.9) * (6 + t * 14);
    const barW = (0.18 + rand() * 0.85) * spread;
    ctx.globalAlpha = (1 - t * 0.65) * 0.42;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(moonX - barW / 2 + wave, y, barW, 1.5 + t * 2.4);
  }
  ctx.restore();

  // Submerged railway / pier posts on left
  ctx.save();
  ctx.fillStyle = palette.shadow;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    const px = w * (0.08 + t * 0.34);
    const py = horizon + 12 + (1 - t) * (h - horizon) * 0.52;
    const postH = 18 + (1 - t) * 72;
    ctx.fillRect(px, py - postH, 3 + (1 - t) * 5, postH);
  }
  // Distant misty ridge
  ctx.beginPath();
  ctx.moveTo(0, horizon + 2);
  ctx.quadraticCurveTo(w * 0.25, horizon - 26, w * 0.52, horizon + 2);
  ctx.lineTo(0, horizon + 4);
  ctx.fill();
  ctx.restore();
}

function drawSunsetTrain(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.68);
  const sunX = w * (0.34 + p * 0.08);
  const sunY = h * 0.46;
  drawGlowOrb(ctx, sunX, sunY, w * 0.32, palette.accent, 0.42);
  drawGlowOrb(ctx, sunX, sunY, w * 0.09, "#FFF4E0", 0.55);

  // Soft passing cloud bands
  ctx.save();
  for (let i = 0; i < 7; i += 1) {
    const cx = ((rand() * w * 1.4 - p * w * 0.35) % (w * 1.3)) - w * 0.15;
    const cy = h * (0.16 + rand() * 0.34);
    const cw = w * (0.22 + rand() * 0.26);
    const ch = h * (0.03 + rand() * 0.045);
    ctx.globalAlpha = 0.16 + rand() * 0.14;
    ctx.fillStyle = i % 2 === 0 ? palette.accent : palette.mist;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Passing horizon & telegraph poles outside train window
  const groundY = h * 0.7;
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.save();
  ctx.strokeStyle = palette.shadow;
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    const poleX = ((i * w * 0.28 - p * w * 0.9) % (w * 1.2) + w * 1.2) % (w * 1.2) - w * 0.1;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(poleX, h * 0.26, 4, h * 0.48);
    ctx.fillRect(poleX - 14, h * 0.32, 32, 2.5);
  }
  // Power lines
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.33);
  ctx.quadraticCurveTo(w * 0.5, h * 0.4, w, h * 0.32);
  ctx.stroke();
  ctx.restore();

  // Train interior window silhouette framing the scene
  ctx.save();
  ctx.fillStyle = "#080706";
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, 0, w, h * 0.12);
  ctx.fillRect(0, h * 0.84, w, h * 0.16);
  ctx.fillRect(0, 0, w * 0.08, h);
  ctx.fillRect(w * 0.92, 0, w * 0.08, h);
  // Center mullion
  ctx.fillRect(w * 0.49, h * 0.1, w * 0.025, h * 0.76);
  // Subtle warm rim reflection on sill
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(w * 0.08, h * 0.835, w * 0.84, 2.5);
  ctx.restore();

  // Floating sunlit motes inside carriage
  drawStarsAndDust(ctx, w, h, rand, p * 1.6, palette, 24);
}

function drawRainCorridor(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.52);
  const vpX = w * (0.5 + Math.sin(p * Math.PI) * 0.015);
  const vpY = h * 0.48;

  // Perspective corridor lines
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.2;
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(vpX, vpY);
    ctx.stroke();
  });

  // Corridor arches receding
  for (let i = 1; i <= 7; i += 1) {
    const t = ((i / 7 + p * 0.14) % 1) * 0.92 + 0.06;
    const boxW = w * t;
    const boxH = h * t * 0.92;
    ctx.strokeStyle = i % 2 === 0 ? palette.accent : palette.secondary;
    ctx.globalAlpha = 0.08 + t * 0.22;
    ctx.lineWidth = 1 + t * 2;
    ctx.strokeRect(vpX - boxW / 2, vpY - boxH / 2, boxW, boxH);

    // Ceiling pendant light
    const lightY = vpY - boxH / 2 + 6 * t;
    drawGlowOrb(ctx, vpX, lightY, 16 + t * 56, palette.accent, 0.24 * t);
    // Wet floor reflection
    const floorY = vpY + boxH / 2 - 4 * t;
    drawGlowOrb(ctx, vpX, floorY, 12 + t * 44, palette.accent, 0.16 * t);
  }

  // Distant bright doorway at vanishing point
  const doorW = w * 0.065;
  const doorH = h * 0.18;
  drawGlowOrb(ctx, vpX, vpY, w * 0.18, palette.accent, 0.34);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(vpX - doorW / 2, vpY - doorH / 2, doorW, doorH);

  // Subtle lone silhouette in doorway
  ctx.fillStyle = palette.shadow;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(vpX, vpY - doorH * 0.08, doorW * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(vpX - doorW * 0.16, vpY + doorH * 0.02, doorW * 0.32, doorH * 0.46);
  ctx.restore();

  drawStarsAndDust(ctx, w, h, rand, p, palette, 28);
}

function drawOldClassroom(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.65);

  // Wall shadow gradient
  const wallGrad = ctx.createLinearGradient(0, 0, w, 0);
  wallGrad.addColorStop(0, "rgba(6,5,4,0.85)");
  wallGrad.addColorStop(0.5, "rgba(18,14,11,0.45)");
  wallGrad.addColorStop(1, "rgba(6,5,4,0.92)");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  // 3 Tall afternoon windows on the left-center
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    const wx = w * (0.14 + i * 0.17);
    const wy = h * 0.14;
    const ww = w * 0.125;
    const wh = h * 0.44;
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.36;
    ctx.fillRect(wx, wy, ww, wh);

    // Slanted light shafts into the room
    const shaft = ctx.createLinearGradient(wx, wy, wx + w * 0.28, h);
    shaft.addColorStop(0, palette.mist);
    shaft.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shaft;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + ww, wy);
    ctx.lineTo(wx + ww + w * 0.25, h);
    ctx.lineTo(wx + w * 0.15, h);
    ctx.closePath();
    ctx.fill();

    // Window panes
    ctx.strokeStyle = palette.shadow;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
  }

  // Silhouetted desks in foreground
  ctx.fillStyle = palette.shadow;
  ctx.globalAlpha = 0.92;
  for (let i = 0; i < 4; i += 1) {
    const dx = w * (0.12 + i * 0.21);
    const dy = h * (0.72 + (i % 2) * 0.04);
    ctx.fillRect(dx, dy, w * 0.15, 7);
    ctx.fillRect(dx + 10, dy + 7, 4, h - dy);
    ctx.fillRect(dx + w * 0.15 - 14, dy + 7, 4, h - dy);
  }
  ctx.restore();

  // Drifting chalk dust / snow particles
  drawStarsAndDust(ctx, w, h, rand, p * 1.4, palette, 46);
}

function drawSnowForest(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.62);
  drawGlowOrb(ctx, w * 0.52, h * 0.44, w * 0.3, palette.accent, 0.22);

  // Distant warm lantern glow between trees
  drawGlowOrb(ctx, w * 0.54, h * 0.64, w * 0.11, palette.accent, 0.55);

  // Layered pine silhouettes
  const layers = [
    { count: 22, baseY: h * 0.72, scale: 0.55, alpha: 0.45 },
    { count: 16, baseY: h * 0.82, scale: 0.82, alpha: 0.72 },
    { count: 11, baseY: h * 0.96, scale: 1.15, alpha: 0.95 },
  ];

  layers.forEach((layer, li) => {
    ctx.save();
    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = layer.alpha;
    for (let i = 0; i < layer.count; i += 1) {
      const tx = (i / (layer.count - 1)) * w + (rand() - 0.5) * 40 + (li - 1) * p * 14;
      const th = h * (0.24 + rand() * 0.2) * layer.scale;
      const tw = w * (0.045 + rand() * 0.03) * layer.scale;
      ctx.beginPath();
      ctx.moveTo(tx, layer.baseY - th);
      ctx.lineTo(tx - tw, layer.baseY);
      ctx.lineTo(tx + tw, layer.baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // Snowflakes falling softly
  ctx.save();
  for (let i = 0; i < 85; i += 1) {
    const sx = (rand() * w + Math.sin(p * Math.PI * 2 + i) * 24 + w) % w;
    const sy = ((rand() * h + p * h * (0.45 + rand() * 0.55)) % h);
    const sr = 0.8 + rand() * 2.2;
    ctx.globalAlpha = 0.25 + rand() * 0.55;
    ctx.fillStyle = "#FAF6EE";
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNeonRooftop(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.58);

  // Soft city bokeh & skyline blocks
  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const bx = i * (w / 17) - 10;
    const bw = w * (0.04 + rand() * 0.055);
    const bh = h * (0.18 + rand() * 0.36);
    const by = h * 0.72 - bh;
    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(bx, by, bw, bh);

    // Tiny lit building windows
    ctx.fillStyle = i % 3 === 0 ? palette.accent : palette.secondary;
    for (let wy = by + 10; wy < h * 0.68; wy += 12) {
      if (rand() > 0.52) {
        ctx.globalAlpha = 0.25 + rand() * 0.45;
        ctx.fillRect(bx + 5, wy, bw * 0.35, 3);
      }
    }
  }
  ctx.restore();

  // Large cinematic out-of-focus neon bokeh orbs
  for (let i = 0; i < 12; i += 1) {
    const ox = rand() * w;
    const oy = h * (0.25 + rand() * 0.45);
    const or = 16 + rand() * 44;
    const col = i % 2 === 0 ? palette.accent : palette.secondary;
    drawGlowOrb(ctx, ox, oy, or, col, 0.22);
  }

  // Wet rooftop floor + reflection
  const floorY = h * 0.74;
  ctx.fillStyle = "#070809";
  ctx.fillRect(0, floorY, w, h - floorY);
  drawGlowOrb(ctx, w * 0.32, h * 0.86, w * 0.24, palette.accent, 0.22);
  drawGlowOrb(ctx, w * 0.72, h * 0.85, w * 0.22, palette.secondary, 0.2);

  // Rooftop railing
  ctx.save();
  ctx.strokeStyle = "rgba(243,236,224,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY - 26);
  ctx.lineTo(w, floorY - 26);
  ctx.stroke();

  // Fine falling rain streaks
  ctx.strokeStyle = "rgba(240, 245, 250, 0.22)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 65; i += 1) {
    const rx = (rand() * w + p * 60) % w;
    const ry = (rand() * h + p * h * 1.4) % h;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 4, ry + 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFloatingStairs(ctx, w, h, palette, rand, p) {
  drawSky(ctx, w, h, palette, 0.74);
  drawStarsAndDust(ctx, w, h, rand, p, palette, 60);

  // Ethereal vertical shafts of light
  ctx.save();
  for (let i = 0; i < 4; i += 1) {
    const sx = w * (0.22 + i * 0.19);
    const beam = ctx.createLinearGradient(sx, 0, sx, h);
    beam.addColorStop(0, palette.mist);
    beam.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = beam;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(sx, 0, w * 0.08, h);
  }

  // Dreamlike suspended stone steps climbing toward a luminous arch
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const floatOffset = Math.sin(p * Math.PI * 2 + i * 0.7) * 5;
    const stepX = w * (0.18 + t * 0.42);
    const stepY = h * (0.82 - t * 0.44) + floatOffset;
    const stepW = w * (0.14 - t * 0.055);
    const stepH = 8 - t * 2;
    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(stepX, stepY, stepW, stepH);
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.48;
    ctx.fillRect(stepX, stepY, stepW, 1.8);
  }

  // Luminous arched doorway floating in the sky
  const ax = w * 0.67;
  const ay = h * 0.34;
  drawGlowOrb(ctx, ax, ay, w * 0.16, palette.accent, 0.36);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(ax, ay - 16, 22, Math.PI, 0);
  ctx.lineTo(ax + 22, ay + 34);
  ctx.lineTo(ax - 22, ay + 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMidnightHarbor(ctx, w, h, palette, rand, p) {
  const horizon = h * 0.58;
  drawSky(ctx, w, h, palette, 0.58);
  drawStarsAndDust(ctx, w, h, rand, p, palette, 38);

  // Rolling harbor fog banks
  for (let i = 0; i < 6; i += 1) {
    const fx = ((rand() * w + p * 85 * (i % 2 === 0 ? 1 : -1)) % (w * 1.2) + w * 1.2) % (w * 1.2) - w * 0.1;
    const fy = horizon - 14 + rand() * 34;
    drawGlowOrb(ctx, fx, fy, w * 0.22, palette.mist, 0.6);
  }

  // Dark water
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Distant ferry lights & vertical shimmer
  const lights = [0.22, 0.38, 0.68, 0.82];
  lights.forEach((lxRatio, idx) => {
    const lx = w * lxRatio;
    const col = idx % 2 === 0 ? palette.accent : palette.secondary;
    drawGlowOrb(ctx, lx, horizon - 4, 24, col, 0.55);
    ctx.save();
    for (let r = 0; r < 14; r += 1) {
      const ry = horizon + 6 + r * 9;
      const rw = (18 - r * 0.8) * (0.7 + 0.3 * Math.sin(p * Math.PI * 3 + r + idx));
      ctx.globalAlpha = 0.34 * (1 - r / 15);
      ctx.fillStyle = col;
      ctx.fillRect(lx - rw / 2, ry, rw, 2);
    }
    ctx.restore();
  });

  // Floating lantern / warm beacon drifting gently
  const lanX = w * (0.48 + Math.sin(p * Math.PI * 2) * 0.02);
  const lanY = h * (0.42 - p * 0.05);
  drawGlowOrb(ctx, lanX, lanY, 44, palette.accent, 0.52);
  ctx.fillStyle = "#FFF5E4";
  ctx.fillRect(lanX - 3, lanY - 5, 6, 9);
}

function drawSceneByArchetype(ctx, w, h, archetype, palette, rand, progress) {
  switch (archetype) {
    case "sunset-train":
      drawSunsetTrain(ctx, w, h, palette, rand, progress);
      break;
    case "rain-corridor":
      drawRainCorridor(ctx, w, h, palette, rand, progress);
      break;
    case "old-classroom":
      drawOldClassroom(ctx, w, h, palette, rand, progress);
      break;
    case "snow-forest":
      drawSnowForest(ctx, w, h, palette, rand, progress);
      break;
    case "neon-rooftop":
      drawNeonRooftop(ctx, w, h, palette, rand, progress);
      break;
    case "floating-stairs":
      drawFloatingStairs(ctx, w, h, palette, rand, progress);
      break;
    case "midnight-harbor":
      drawMidnightHarbor(ctx, w, h, palette, rand, progress);
      break;
    case "ocean-moonlight":
    default:
      drawOceanMoonlight(ctx, w, h, palette, rand, progress);
      break;
  }
}

function drawCoverImage(ctx, img, w, h, progress) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  const zoom = 1.04 + progress * 0.07;
  let drawW = w * zoom;
  let drawH = h * zoom;
  if (imgRatio > boxRatio) {
    drawW = drawH * imgRatio;
  } else {
    drawH = drawW / imgRatio;
  }
  const offsetX = (w - drawW) / 2 + (progress - 0.5) * 18;
  const offsetY = (h - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function applyFilmFinishing(ctx, w, h, palette, rand, progress, options = {}) {
  const { letterbox = true } = options;

  // Color stock tint
  ctx.save();
  ctx.fillStyle = palette.tint;
  ctx.fillRect(0, 0, w, h);

  // Subtle anamorphic warm horizontal flare
  const flareY = h * (0.38 + Math.sin(progress * Math.PI) * 0.04);
  const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
  flareGrad.addColorStop(0, "rgba(0,0,0,0)");
  flareGrad.addColorStop(0.5, palette.mist);
  flareGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = flareGrad;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, flareY - 1.5, w, 3);

  // Monochrome conversion for silver halide stock
  if (palette.monochrome) {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  // Analog vignette
  const vig = ctx.createRadialGradient(
    w / 2,
    h / 2,
    w * 0.22,
    w / 2,
    h / 2,
    w * 0.72,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, `rgba(4,3,3,${palette.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Delicate film dust specks (deterministic per subtle frame step)
  const dustCount = Math.floor(14 * (palette.grain / 0.06));
  ctx.fillStyle = "rgba(255, 248, 236, 0.14)";
  for (let i = 0; i < dustCount; i += 1) {
    const dx = rand() * w;
    const dy = rand() * h;
    ctx.fillRect(dx, dy, 1.2, 1.2);
  }

  // Subtle cinema letterbox bars
  if (letterbox) {
    const barH = Math.round(h * 0.075);
    ctx.fillStyle = "#060505";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
  }
  ctx.restore();
}

function drawSubtitles(ctx, w, h, subtitle, enLine) {
  if (!subtitle && !enLine) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.92)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;

  const baseSize = Math.max(15, Math.round(w * 0.023));
  const yBase = h * 0.865;

  if (subtitle) {
    ctx.font = `500 ${baseSize}px "Noto Serif SC", "Songti SC", Georgia, serif`;
    ctx.fillStyle = "rgba(247, 241, 230, 0.95)";
    ctx.fillText(subtitle, w / 2, enLine ? yBase - baseSize * 0.6 : yBase, w * 0.84);
  }
  if (enLine) {
    const enSize = Math.max(11, Math.round(w * 0.0135));
    ctx.font = `italic 400 ${enSize}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = "rgba(217, 197, 168, 0.78)";
    ctx.fillText(enLine, w / 2, yBase + baseSize * 0.52, w * 0.82);
  }
  ctx.restore();
}

export function renderShotFrame(
  ctx,
  w,
  h,
  shot,
  filmStockId = "kodak-2383",
  progress = 0.25,
  options = {},
) {
  const {
    loadedImage = null,
    showSubtitle = false,
    letterbox = true,
    cameraZoom = true,
  } = options;

  const stock = getFilmStock(filmStockId);
  const seed = hashString(`${shot?.id || "shot"}-${shot?.archetype || "ocean"}-${shot?.visualPrompt || ""}`);
  const rand = mulberry32(seed);

  ctx.save();
  if (cameraZoom) {
    const scale = 1.0 + progress * 0.055;
    const panX = (progress - 0.5) * -14;
    const panY = (progress - 0.5) * -6;
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
  }

  if (loadedImage) {
    drawCoverImage(ctx, loadedImage, w, h, progress);
  } else {
    drawSceneByArchetype(
      ctx,
      w,
      h,
      shot?.archetype || "ocean-moonlight",
      stock.palette,
      rand,
      progress,
    );
  }
  ctx.restore();

  applyFilmFinishing(ctx, w, h, stock.palette, rand, progress, { letterbox });

  if (showSubtitle && shot) {
    drawSubtitles(ctx, w, h, shot.subtitle, shot.enSubtitle);
  }
}

export const SHOT_DURATION_SEC = 5.5;

export function getDreamDuration(dream) {
  const count = dream?.shots?.length || 4;
  return count * SHOT_DURATION_SEC;
}

export function renderSequenceFrame(
  ctx,
  w,
  h,
  dream,
  currentTimeSec,
  loadedImages = {},
  options = {},
) {
  const { showSubtitles = true, showTitleCard = true } = options;
  const shots = dream?.shots?.length ? dream.shots : [];
  if (!shots.length) {
    ctx.fillStyle = "#090807";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const totalDur = shots.length * SHOT_DURATION_SEC;
  const clampedTime = Math.max(0, Math.min(currentTimeSec, totalDur - 0.001));
  const shotIndex = Math.min(shots.length - 1, Math.floor(clampedTime / SHOT_DURATION_SEC));
  const localTime = clampedTime - shotIndex * SHOT_DURATION_SEC;
  const progress = localTime / SHOT_DURATION_SEC;
  const currentShot = shots[shotIndex];

  // Primary shot
  renderShotFrame(ctx, w, h, currentShot, dream.filmStock, progress, {
    loadedImage: loadedImages[currentShot.id] || null,
    showSubtitle: false,
    letterbox: true,
    cameraZoom: true,
  });

  // Smooth dissolve transition to next shot in last 0.85s
  const fadeWindow = 0.85;
  if (localTime > SHOT_DURATION_SEC - fadeWindow && shotIndex < shots.length - 1) {
    const nextShot = shots[shotIndex + 1];
    const alpha = (localTime - (SHOT_DURATION_SEC - fadeWindow)) / fadeWindow;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    renderShotFrame(ctx, w, h, nextShot, dream.filmStock, 0.04 * alpha, {
      loadedImage: loadedImages[nextShot.id] || null,
      showSubtitle: false,
      letterbox: true,
      cameraZoom: true,
    });
    ctx.restore();
  }

  // Subtitles (with gentle fade in/out inside each shot)
  if (showSubtitles && !(showTitleCard && clampedTime < 2.2)) {
    let subAlpha = 1;
    if (localTime < 0.45) subAlpha = localTime / 0.45;
    if (localTime > SHOT_DURATION_SEC - 0.55) {
      subAlpha = (SHOT_DURATION_SEC - localTime) / 0.55;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, subAlpha));
    drawSubtitles(ctx, w, h, currentShot.subtitle, currentShot.enSubtitle);
    ctx.restore();
  }

  // Opening title card overlay (0..2.4s)
  if (showTitleCard && clampedTime < 2.4) {
    const cardAlpha =
      clampedTime < 0.5
        ? clampedTime / 0.5
        : clampedTime > 1.7
          ? (2.4 - clampedTime) / 0.7
          : 1;
    ctx.save();
    ctx.fillStyle = `rgba(9, 8, 7, ${0.52 * cardAlpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, cardAlpha));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `500 ${Math.max(10, Math.round(w * 0.012))}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = "rgba(217, 155, 82, 0.9)";
    ctx.fillText(
      `CHAOS DREAM LAB  ·  ${dream.reelCode || "REEL #001"}`,
      w / 2,
      h * 0.41,
    );

    ctx.font = `600 ${Math.max(22, Math.round(w * 0.042))}px "Noto Serif SC", Georgia, serif`;
    ctx.fillStyle = "#F5EEE3";
    ctx.fillText(dream.title || "无题之梦", w / 2, h * 0.5, w * 0.82);

    ctx.font = `italic 400 ${Math.max(12, Math.round(w * 0.016))}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = "rgba(220, 206, 186, 0.8)";
    ctx.fillText(
      `${dream.dreamDate || ""}  ·  A DREAM BY ${dream.authorName || "DREAMER"}`,
      w / 2,
      h * 0.585,
    );
    ctx.restore();
  }

  // Opening fade from black & closing fade to black
  if (clampedTime < 0.45) {
    ctx.fillStyle = `rgba(6, 5, 5, ${1 - clampedTime / 0.45})`;
    ctx.fillRect(0, 0, w, h);
  } else if (clampedTime > totalDur - 0.85) {
    ctx.fillStyle = `rgba(6, 5, 5, ${(clampedTime - (totalDur - 0.85)) / 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export function generateStillDataUrl(shot, filmStockId, width = 640, height = 360) {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  renderShotFrame(ctx, width, height, shot, filmStockId, 0.35, {
    showSubtitle: false,
    letterbox: false,
    cameraZoom: false,
  });
  return canvas.toDataURL("image/jpeg", 0.88);
}
