export function getAiConfig() {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const openaiBase = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const llmModel = process.env.LLM_MODEL || "gpt-4o-mini";

  const imageKey = process.env.IMAGE_API_KEY || openaiKey;
  const imageBase = (process.env.IMAGE_BASE_URL || openaiBase).replace(/\/$/, "");
  const imageModel = process.env.IMAGE_MODEL || "gpt-image-1";

  const asrKey = process.env.ASR_API_KEY || openaiKey;
  const asrBase = (process.env.ASR_BASE_URL || openaiBase).replace(/\/$/, "");
  const asrModel = process.env.ASR_MODEL || "whisper-1";

  const seedanceKey = process.env.SEEDANCE_API_KEY || "";
  const seedanceUrl = (process.env.SEEDANCE_API_URL || "").replace(/\/$/, "");
  const seedanceModel = process.env.SEEDANCE_MODEL || "seedance-1-0-pro";

  return {
    llm: {
      configured: Boolean(openaiKey),
      apiKey: openaiKey,
      baseUrl: openaiBase,
      model: llmModel,
    },
    image: {
      configured: Boolean(imageKey && process.env.IMAGE_API_KEY),
      apiKey: imageKey,
      baseUrl: imageBase,
      model: imageModel,
    },
    asr: {
      configured: Boolean(asrKey),
      apiKey: asrKey,
      baseUrl: asrBase,
      model: asrModel,
    },
    video: {
      configured: Boolean(seedanceKey && seedanceUrl),
      apiKey: seedanceKey,
      url: seedanceUrl,
      model: seedanceModel,
    },
  };
}

export function getPublicAiStatus() {
  const cfg = getAiConfig();
  return {
    llm: cfg.llm.configured ? { mode: "live", model: cfg.llm.model } : { mode: "studio", model: "REM-PARSER-LOCAL" },
    image: cfg.image.configured ? { mode: "live", model: cfg.image.model } : { mode: "studio", model: "35MM-CINEMA-ENGINE" },
    asr: cfg.asr.configured ? { mode: "live", model: cfg.asr.model } : { mode: "browser", model: "WEB-SPEECH + AUDIO-VAULT" },
    video: cfg.video.configured ? { mode: "live", model: cfg.video.model } : { mode: "studio", model: "TIMELINE-PROJECTOR-WEBM" },
  };
}
