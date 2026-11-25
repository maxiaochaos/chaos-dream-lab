import { NextResponse } from "next/server";
import { getAiConfig } from "../../../../lib/ai/config";

export async function POST(request) {
  try {
    const body = await request.json();
    const { dream } = body || {};
    if (!dream) {
      return NextResponse.json({ ok: false, error: "缺少梦境数据" }, { status: 400 });
    }

    const cfg = getAiConfig();

    if (cfg.video.configured) {
      try {
        const promptSummary = (dream.shots || [])
          .map((s, i) => `Shot ${i + 1}: ${s.visualPrompt || s.subtitle}`)
          .join(" | ");
        const res = await fetch(cfg.video.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.video.apiKey}`,
          },
          body: JSON.stringify({
            model: cfg.video.model,
            prompt: promptSummary,
            image_url: dream.shots?.[0]?.imageUrl || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const videoUrl = data?.video_url || data?.data?.video_url || data?.output?.url || null;
          if (videoUrl) {
            return NextResponse.json({
              ok: true,
              mode: "live",
              videoUrl,
              status: "ready",
            });
          }
        }
      } catch {
        // Gracefully fall back to built-in cinema sequence renderer
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "studio",
      videoUrl: null,
      status: "ready",
      message: "已由内置 35mm 影院放映引擎完成时间轴母带封片，支持沉浸放映与 .webm 视频导出。",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "影片封片失败" },
      { status: 500 },
    );
  }
}
