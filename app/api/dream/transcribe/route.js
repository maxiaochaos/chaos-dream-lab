import { NextResponse } from "next/server";
import { getAiConfig } from "../../../../lib/ai/config";

export async function POST(request) {
  const cfg = getAiConfig();
  if (!cfg.asr.configured) {
    return NextResponse.json({
      ok: true,
      mode: "browser",
      text: "",
      message: "未配置云端 ASR Key，已启用浏览器实时听写与本地原声保存。",
    });
  }

  try {
    const incomingForm = await request.formData();
    const audioFile = incomingForm.get("audio");
    if (!audioFile) {
      return NextResponse.json({ ok: false, error: "未收到音频文件" }, { status: 400 });
    }

    const forwardForm = new FormData();
    forwardForm.append("file", audioFile, "dream-voice.webm");
    forwardForm.append("model", cfg.asr.model);

    const res = await fetch(`${cfg.asr.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.asr.apiKey}`,
      },
      body: forwardForm,
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: "云端语音转写服务返回异常，已保留原声录音",
      });
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      mode: "live",
      text: data?.text || "",
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "语音转写请求失败，已保留原声录音",
    });
  }
}
