import { CAMERA_MOTIONS, SCENE_ARCHETYPES } from "../cinema/presets";
import { getAiConfig } from "./config";

const KEYWORD_MAP = [
  {
    archetype: "ocean-moonlight",
    keywords: ["海", "海洋", "水", "浪", "月亮", "沙滩", "湖", "河", "游", "ocean", "sea", "moon", "water"],
    symbol: "月夜水面",
    enLine: "Moonlight settles gently across the quiet surface of memory.",
  },
  {
    archetype: "sunset-train",
    keywords: ["车", "电车", "火车", "地铁", "车站", "黄昏", "落日", "窗外", "铁轨", "train", "tram", "sunset"],
    symbol: "慢行车厢",
    enLine: "Passing lights trace the edge of a quiet dusk carriage.",
  },
  {
    archetype: "rain-corridor",
    keywords: ["走廊", "门", "电梯", "办公室", "楼道", "白灯", "墙", "迷宫", "镜子", "corridor", "hallway", "door", "elevator"],
    symbol: "对称走廊",
    enLine: "An endless symmetrical hallway hums softly between waking and sleep.",
  },
  {
    archetype: "old-classroom",
    keywords: ["教室", "学校", "同学", "老师", "课桌", "黑板", "信", "纸", "校园", "classroom", "school", "desk"],
    symbol: "旧日教室",
    enLine: "Afternoon dust drifts slowly across desks that remember your name.",
  },
  {
    archetype: "snow-forest",
    keywords: ["雪", "冬天", "森林", "树", "山", "白茫茫", "松林", "冷", "snow", "winter", "forest", "woods"],
    symbol: "落雪松林",
    enLine: "Silent snow gathers over distant pines and a single warm lantern.",
  },
  {
    archetype: "neon-rooftop",
    keywords: ["雨", "霓虹", "城市", "天台", "楼顶", "街", "夜", "酒吧", "灯火", "neon", "rain", "rooftop", "city"],
    symbol: "雨夜霓虹",
    enLine: "City neon softens into wet reflections high above the sleeping streets.",
  },
  {
    archetype: "floating-stairs",
    keywords: ["飞", "失重", "漂浮", "楼梯", "台阶", "云", "天空", "坠落", "翅膀", "fly", "stairs", "float", "sky"],
    symbol: "悬浮阶梯",
    enLine: "Gravity loosens its grip where stone steps climb into pale clouds.",
  },
  {
    archetype: "midnight-harbor",
    keywords: ["雾", "码头", "船", "灯塔", "港", "桥", "岛", "凌晨", "fog", "harbor", "lighthouse", "mist"],
    symbol: "薄雾码头",
    enLine: "Through midnight fog, a lone harbor light keeps watch until dawn.",
  },
];

function splitSentences(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/[。！？!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function detectMatches(text) {
  const lower = String(text || "").toLowerCase();
  const scored = KEYWORD_MAP.map((entry) => {
    const score = entry.keywords.reduce(
      (acc, kw) => (lower.includes(kw.toLowerCase()) ? acc + 1 : acc),
      0,
    );
    return { ...entry, score };
  })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [KEYWORD_MAP[2], KEYWORD_MAP[0], KEYWORD_MAP[6], KEYWORD_MAP[7]];
  }
  const result = [...scored];
  const fallbackPool = [KEYWORD_MAP[2], KEYWORD_MAP[0], KEYWORD_MAP[1], KEYWORD_MAP[7]];
  for (const item of fallbackPool) {
    if (result.length >= 4) break;
    if (!result.some((r) => r.archetype === item.archetype)) {
      result.push(item);
    }
  }
  return result.slice(0, 4);
}

function inferTitle(rawText, providedTitle, primaryMatch) {
  if (providedTitle && providedTitle.trim()) {
    return providedTitle.trim();
  }
  const sentences = splitSentences(rawText);
  if (sentences.length > 0 && sentences[0].length <= 16) {
    return sentences[0];
  }
  const titleMap = {
    "ocean-moonlight": "月光沉入海面的那一刻",
    "sunset-train": "开往黄昏深处的慢车",
    "rain-corridor": "荧光长廊尽头的微光",
    "old-classroom": "斜阳落在旧课桌上的午后",
    "snow-forest": "落雪森林里的孤灯",
    "neon-rooftop": "霓虹雨夜的静谧天台",
    "floating-stairs": "云端阶梯与失重时刻",
    "midnight-harbor": "凌晨四点的薄雾码头",
  };
  return titleMap[primaryMatch.archetype] || "醒来前未完的胶片";
}

function buildLocalDreamDevelopment({ title, rawText, mood = "怀旧", filmStock = "lumon-35mm" }) {
  const sentences = splitSentences(rawText);
  const matches = detectMatches(rawText);
  const resolvedTitle = inferTitle(rawText, title, matches[0]);

  const fallbackLines = [
    "画面在微弱的呼吸声里缓缓显影，一切熟悉又略有错位。",
    "时间在这里放慢了速度，光线沿着记忆的边缘轻轻流动。",
    "你停在最清晰的那一帧前，试图记住对方的轮廓与温度。",
    "闹钟响起前的一秒，整段梦境安静地收拢成一卷胶片。",
  ];

  const shots = Array.from({ length: 4 }).map((_, idx) => {
    const match = matches[idx % matches.length];
    const sourceLine =
      sentences[idx] ||
      (idx === 0 && sentences[0]) ||
      (idx === 3 && sentences[sentences.length - 1]) ||
      fallbackLines[idx];

    const trimmedSub =
      sourceLine.length > 34 ? `${sourceLine.slice(0, 33)}…` : sourceLine;

    const archetypeMeta =
      SCENE_ARCHETYPES.find((a) => a.id === match.archetype) || SCENE_ARCHETYPES[0];

    return {
      id: `shot-${Date.now()}-${idx + 1}`,
      archetype: match.archetype,
      camera: CAMERA_MOTIONS[idx % CAMERA_MOTIONS.length],
      subtitle: trimmedSub,
      enSubtitle: match.enLine,
      visualPrompt: `${archetypeMeta.name}，${trimmedSub}，35mm 电影胶片摄影，克制对称构图，电影级微粒与柔和光影`,
    };
  });

  const symbols = Array.from(new Set(matches.map((m) => m.symbol))).slice(0, 4);
  if (symbols.length < 3) {
    symbols.push("微光残影", "清醒边界");
  }

  const summary =
    sentences.length > 0
      ? `${sentences[0].slice(0, 46)}${sentences[0].length > 46 ? "…" : ""}`
      : "一段在清醒边缘被打捞下来的深夜记忆胶片。";

  const moodInterpretations = {
    怀旧: "这段梦境带着温润的时间滤镜，潜意识正替你重新冲洗一段被日常尘封、却依然重要的旧记忆。",
    奇幻: "空间与重力的改写，往往意味着大脑在夜晚替你打开了一扇不受现实规则束缚的自由通道。",
    怅然: "那些没来得及说完的对话与背影，在梦里被放慢了帧率，只为了给你一次安静告别的机会。",
    温暖: "柔和的光线与熟悉场景是潜意识筑起的安全屋，它正在温柔地修补你白天的疲惫。",
    失重: "摆脱重力的瞬间往往对应着情绪的松绑——梦境正邀请你暂时放下控制，允许自己漂浮一会儿。",
    悬疑: "极度对称与留白的边界空间，像清醒与梦境之间的记忆分割线，提醒你留意内心尚未明朗的直觉。",
  };

  return {
    title: resolvedTitle,
    enTitle: `REM ARCHIVE · ${matches[0].archetype.replace("-", " ").toUpperCase()}`,
    summary,
    interpretation: moodInterpretations[mood] || moodInterpretations["怀旧"],
    symbols,
    filmStock,
    shots,
    engine: "studio",
  };
}

export async function developDreamScript(payload) {
  const cfg = getAiConfig();
  if (!cfg.llm.configured) {
    return buildLocalDreamDevelopment(payload);
  }

  const validArchetypes = SCENE_ARCHETYPES.map((s) => s.id).join(", ");
  const systemPrompt = `你是「CHAOS DREAM LAB · 梦境胶片放映厅」的梦境编剧与分镜导演。
请把用户的梦境文字/口述整理成一部 4 镜头的 35mm 诗意梦境短片脚本，严格输出 JSON：
{
  "title": "不超过14字的中文电影感片名",
  "enTitle": "简短英文大写副标题",
  "summary": "一句温柔凝练的中文剧情梗概（不超过45字）",
  "interpretation": "一段克制、温柔、富有共鸣的潜意识心理观察（不超过80字）",
  "symbols": ["意象词1", "意象词2", "意象词3", "意象词4"],
  "shots": [
    {
      "archetype": "从以下选一个最贴合的场景: ${validArchetypes}",
      "camera": "镜头运动英文短语，如 SYMMETRIC DOLLY IN",
      "subtitle": "这一镜的中文电影字幕（12-28字，忠实于用户原梦）",
      "enSubtitle": "对应的简短诗意英文字幕",
      "visualPrompt": "用于文生图的详细画面描述（中文或英文，含构图光线胶片感）"
    }
  ]
}`;

  try {
    const res = await fetch(`${cfg.llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.llm.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `用户提供标题：${payload.title || "未命名"}\n情绪氛围：${payload.mood || "怀旧"}\n胶片风格：${payload.filmStock || "lumon-35mm"}\n梦境原记：\n${payload.rawText}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return buildLocalDreamDevelopment(payload);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const validIds = new Set(SCENE_ARCHETYPES.map((s) => s.id));

    const shots = (parsed.shots || []).slice(0, 4).map((shot, idx) => ({
      id: `shot-${Date.now()}-${idx + 1}`,
      archetype: validIds.has(shot.archetype) ? shot.archetype : SCENE_ARCHETYPES[idx % SCENE_ARCHETYPES.length].id,
      camera: shot.camera || CAMERA_MOTIONS[idx % CAMERA_MOTIONS.length],
      subtitle: shot.subtitle || "",
      enSubtitle: shot.enSubtitle || "",
      visualPrompt: shot.visualPrompt || "",
    }));

    if (shots.length < 4) {
      return buildLocalDreamDevelopment(payload);
    }

    return {
      title: parsed.title || payload.title || "无题之梦",
      enTitle: parsed.enTitle || "REM MEMORY REEL",
      summary: parsed.summary || "",
      interpretation: parsed.interpretation || "",
      symbols: Array.isArray(parsed.symbols) ? parsed.symbols.slice(0, 4) : [],
      filmStock: payload.filmStock || "lumon-35mm",
      shots,
      engine: "live",
    };
  } catch {
    return buildLocalDreamDevelopment(payload);
  }
}

export async function generateShotImageIfConfigured(prompt) {
  const cfg = getAiConfig();
  if (!cfg.image.configured || !prompt) return null;

  try {
    const res = await fetch(`${cfg.image.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.image.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.image.model,
        prompt: `${prompt}. Cinematic 35mm film still, Severance atmospheric lighting, symmetrical framing, subtle film grain, no text.`,
        size: "1536x1024",
        n: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  } catch {
    return null;
  }
}
