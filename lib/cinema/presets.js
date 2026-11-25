export const FILM_STOCKS = [
  {
    id: "lumon-35mm",
    name: "切割术冷青 35mm",
    enName: "SEVERANCE 35MM TEAL",
    code: "35MM · MDR-04",
    desc: "冷冽荧光青绿与无菌奶白高光，对称静谧的超现实记忆质感",
    swatch: ["#081214", "#18393D", "#6FD3C4", "#E6F0EC"],
    palette: {
      skyTop: "#071012",
      skyMid: "#143035",
      skyHorizon: "#4C9A92",
      accent: "#9AE8DA",
      secondary: "#D9B372",
      shadow: "#060D0F",
      mist: "rgba(111, 211, 196, 0.18)",
      tint: "rgba(26, 86, 82, 0.11)",
      vignette: 0.62,
      grain: 0.055,
      monochrome: false,
    },
  },
  {
    id: "kodak-2383",
    name: "柯达 2383 暖调",
    enName: "KODAK 2383 WARM",
    code: "35MM · 500T",
    desc: "经典胶片琥珀高光与温润阴影，适合怀旧与黄昏梦境",
    swatch: ["#14100D", "#5E3A24", "#D99B52", "#F5DFC2"],
    palette: {
      skyTop: "#0F0C0B",
      skyMid: "#3B2418",
      skyHorizon: "#C97D42",
      accent: "#F4C27F",
      secondary: "#6C8491",
      shadow: "#0B0807",
      mist: "rgba(244, 194, 127, 0.16)",
      tint: "rgba(217, 155, 82, 0.08)",
      vignette: 0.62,
      grain: 0.06,
      monochrome: false,
    },
  },
  {
    id: "wong-neon",
    name: "王家卫霓虹雨夜",
    enName: "NOCTURNE NEON",
    code: "35MM · 800T",
    desc: "祖母绿暗部与绯红霓虹晕染，潮湿而迷离的都市夜梦",
    swatch: ["#071210", "#164A42", "#C94A38", "#F0B67F"],
    palette: {
      skyTop: "#061010",
      skyMid: "#123430",
      skyHorizon: "#3F1E22",
      accent: "#E85D4A",
      secondary: "#38B29A",
      shadow: "#050B0A",
      mist: "rgba(56, 178, 154, 0.14)",
      tint: "rgba(18, 72, 62, 0.12)",
      vignette: 0.7,
      grain: 0.08,
      monochrome: false,
    },
  },
  {
    id: "millennium-dv",
    name: "千禧褪色 DV",
    enName: "Y2K FADED DV",
    code: "MINI-DV · 4:3",
    desc: "微偏青蓝的旧家用录像带质感，带着轻微过曝与回忆柔焦",
    swatch: ["#111722", "#3A4E6C", "#8EA8C3", "#EAE3D2"],
    palette: {
      skyTop: "#101724",
      skyMid: "#2B3E59",
      skyHorizon: "#8BA2B8",
      accent: "#E8DFC8",
      secondary: "#7EA8BE",
      shadow: "#0B1018",
      mist: "rgba(184, 206, 224, 0.18)",
      tint: "rgba(120, 160, 195, 0.1)",
      vignette: 0.52,
      grain: 0.09,
      monochrome: false,
    },
  },
  {
    id: "silver-noir",
    name: "银盐黑白默片",
    enName: "SILVER HALIDE B&W",
    code: "35MM · XX",
    desc: "高反差银盐颗粒与月光层次，把梦境定格成永恒的黑白电影",
    swatch: ["#0A0A0A", "#3A3A3A", "#9E9E9E", "#EFECE6"],
    palette: {
      skyTop: "#090909",
      skyMid: "#262626",
      skyHorizon: "#84827E",
      accent: "#F0EDE6",
      secondary: "#B0ADA6",
      shadow: "#060606",
      mist: "rgba(235, 232, 226, 0.15)",
      tint: "rgba(255, 255, 255, 0.03)",
      vignette: 0.72,
      grain: 0.1,
      monochrome: true,
    },
  },
];

export const MOOD_OPTIONS = [
  { id: "怀旧", en: "NOSTALGIC", chord: [220, 277.18, 329.63, 415.3] },
  { id: "奇幻", en: "SURREAL", chord: [196, 246.94, 293.66, 369.99] },
  { id: "怅然", en: "WISTFUL", chord: [174.61, 220, 261.63, 329.63] },
  { id: "温暖", en: "TENDER", chord: [261.63, 329.63, 392, 493.88] },
  { id: "失重", en: "WEIGHTLESS", chord: [246.94, 293.66, 369.99, 440] },
  { id: "悬疑", en: "ENIGMATIC", chord: [164.81, 196, 246.94, 311.13] },
];

export const SCENE_ARCHETYPES = [
  { id: "rain-corridor", name: "无尽长廊", en: "ENDLESS CORRIDOR" },
  { id: "ocean-moonlight", name: "月夜海面", en: "MOONLIT SEA" },
  { id: "sunset-train", name: "黄昏电车", en: "DUSK TRAIN" },
  { id: "old-classroom", name: "旧日教室", en: "OLD CLASSROOM" },
  { id: "snow-forest", name: "雪夜林海", en: "SNOWY WOODS" },
  { id: "neon-rooftop", name: "霓虹天台", en: "NEON ROOFTOP" },
  { id: "floating-stairs", name: "云端阶梯", en: "FLOATING STAIRS" },
  { id: "midnight-harbor", name: "午夜码头", en: "MIDNIGHT HARBOR" },
];

export const CAMERA_MOTIONS = [
  "SYMMETRIC DOLLY IN",
  "SLOW TRACKING PAN",
  "FLOATING TILT UP",
  "STATIC OBSERVATION",
  "HANDHELD BREATHE",
];

export function getFilmStock(id) {
  return FILM_STOCKS.find((s) => s.id === id) || FILM_STOCKS[0];
}

export function getMoodMeta(id) {
  return MOOD_OPTIONS.find((m) => m.id === id) || MOOD_OPTIONS[0];
}

export function getSceneMeta(id) {
  return SCENE_ARCHETYPES.find((s) => s.id === id) || SCENE_ARCHETYPES[0];
}
