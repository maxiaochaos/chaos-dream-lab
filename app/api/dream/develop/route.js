import { NextResponse } from "next/server";
import {
  developDreamScript,
  generateShotImageIfConfigured,
} from "../../../../lib/ai/dreamParser";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = "develop", title = "", rawText = "", mood = "怀旧", filmStock = "lumon-35mm", shot } = body || {};

    if (action === "reexpose-shot" && shot) {
      const imageUrl = await generateShotImageIfConfigured(shot.visualPrompt || shot.subtitle);
      return NextResponse.json({
        ok: true,
        shot: {
          ...shot,
          imageUrl: imageUrl || shot.imageUrl || null,
          reexposedAt: new Date().toISOString(),
        },
        imageEngine: imageUrl ? "live" : "studio",
      });
    }

    if (!String(rawText).trim()) {
      return NextResponse.json({ ok: false, error: "请输入梦境内容或先录制一段语音" }, { status: 400 });
    }

    const result = await developDreamScript({ title, rawText, mood, filmStock });

    // Optionally generate real keyframes in parallel if IMAGE_API_KEY is explicitly configured
    const shotsWithImages = await Promise.all(
      result.shots.map(async (s) => {
        const imageUrl = await generateShotImageIfConfigured(s.visualPrompt);
        return imageUrl ? { ...s, imageUrl } : s;
      }),
    );

    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        shots: shotsWithImages,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "暗房显影解析失败" },
      { status: 500 },
    );
  }
}
