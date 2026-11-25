"use client";

import { useEffect, useState } from "react";
import {
  CAMERA_MOTIONS,
  FILM_STOCKS,
  getFilmStock,
  SCENE_ARCHETYPES,
} from "../../lib/cinema/presets";
import {
  FilmIcon,
  PlayIcon,
  PlusIcon,
  RefreshIcon,
  SparkleIcon,
} from "../icons/CinemaIcons";
import { ShotStillCanvas } from "../player/DreamFilmCanvas";

const STAGES = [
  { id: 1, code: "01", label: "原记解析", en: "PARSED" },
  { id: 2, code: "02", label: "分镜脚本", en: "STORYBOARD" },
  { id: 3, code: "03", label: "关键帧显影", en: "EXPOSED" },
  { id: 4, code: "04", label: "封片放映", en: "PRINTED" },
];

export default function DarkroomWorkbench({
  draftDream,
  onUpdateDraft,
  onPrintFinalReel,
  onOpenCapture,
  aiStatus,
}) {
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);
  const [reexposingIdx, setReexposingIdx] = useState(-1);
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSelectedShotIdx(0);
    setNotice("");
  }, [draftDream?.id]);

  if (!draftDream) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <div className="lumon-panel rounded-[2px] px-8 py-16">
          <div className="font-reel text-[10px] tracking-[0.22em] text-[#7DD8E8]">
            DARKROOM WORKBENCH // 暗房显影台
          </div>
          <h2 className="mt-3 font-cinema text-2xl text-[#EAF4F4]">
            当前暗房尚无待显影的梦境胶片
          </h2>
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#8EAAB3]">
            先在「捕梦室」录下语音或写下梦境片段，暗房会自动为你拆解 4 格电影分镜；你也可以在放映厅点开任意已有胶片，点击「重进暗房剪辑」来修改画面和胶片质感。
          </p>
          <button
            type="button"
            onClick={onOpenCapture}
            className="mt-7 inline-flex items-center gap-2 rounded-[2px] border border-[#7DD8E8] bg-[#7DD8E8]/18 px-6 py-2.5 text-xs tracking-[0.14em] text-[#F1FCFD] transition hover:bg-[#7DD8E8]/28"
          >
            <PlusIcon className="h-4 w-4 text-[#7DD8E8]" />
            打开捕梦室记录新梦境
          </button>
        </div>
      </section>
    );
  }

  const shots = draftDream.shots || [];
  const activeShot = shots[selectedShotIdx] || shots[0];
  const currentStock = getFilmStock(draftDream.filmStock);
  const completedStage = draftDream.status === "ready" ? 4 : 3;

  const updateShotField = (idx, patch) => {
    const nextShots = shots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onUpdateDraft({ ...draftDream, shots: nextShots });
  };

  const handleReexposeShot = async (idx) => {
    const target = shots[idx];
    if (!target) return;
    setReexposingIdx(idx);
    setNotice("");
    try {
      const res = await fetch("/api/dream/develop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reexpose-shot",
          shot: target,
          filmStock: draftDream.filmStock,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.shot) {
        updateShotField(idx, {
          ...data.shot,
          // Rotate subtle seed variation so user sees fresh composition
          id: `${target.id.split("_r")[0]}_r${Date.now().toString(36).slice(-3)}`,
        });
        setNotice(
          data.imageEngine === "live"
            ? `镜号 0${idx + 1} 已通过云端生图模型重新显影。`
            : `镜号 0${idx + 1} 已在暗房重新曝光显影。`,
        );
      }
    } catch {
      setNotice("重绘请求未能连接服务端，已保留本地实时显影。");
    } finally {
      setReexposingIdx(-1);
    }
  };

  const handlePrintReel = async () => {
    setPrinting(true);
    setPrintProgress(18);
    setNotice("");

    const tick = window.setInterval(() => {
      setPrintProgress((p) => (p < 88 ? p + 14 : p));
    }, 180);

    try {
      const res = await fetch("/api/dream/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dream: draftDream }),
      });
      const data = await res.json();
      window.clearInterval(tick);
      setPrintProgress(100);
      window.setTimeout(() => {
        setPrinting(false);
        setPrintProgress(0);
        onPrintFinalReel({
          ...draftDream,
          status: "ready",
          videoUrl: data?.videoUrl || draftDream.videoUrl || null,
          renderMode: data?.mode || "studio",
        });
      }, 280);
    } catch {
      window.clearInterval(tick);
      setPrinting(false);
      setPrintProgress(0);
      onPrintFinalReel({ ...draftDream, status: "ready" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      {/* Severance MDR File Header + Completion Bar */}
      <div className="lumon-panel mb-6 rounded-[2px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
              <span>DARKROOM REFINEMENT // {draftDream.reelCode}</span>
              <span>·</span>
              <span>FILE STATUS: {printing ? `${printProgress}% PRINTING` : "READY TO PRINT"}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={draftDream.title || ""}
                onChange={(e) => onUpdateDraft({ ...draftDream, title: e.target.value })}
                className="border-b border-transparent bg-transparent font-cinema text-2xl text-[#EFF7F7] outline-none transition focus:border-[#7DD8E8]"
                aria-label="编辑梦境片名"
              />
              <span className="rounded-[2px] border border-[#7DD8E8]/30 bg-[#7DD8E8]/10 px-2 py-0.5 font-reel text-[10px] text-[#8FE0EE]">
                {currentStock.code}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {aiStatus && (
              <div className="hidden rounded-[2px] border border-[#9adae8]/15 bg-[#061117] px-3 py-1.5 font-reel text-[9px] tracking-[0.14em] text-[#7B9AA4] xl:block">
                LLM: {aiStatus.llm?.mode === "live" ? aiStatus.llm.model : "LOCAL-PARSER"} · IMG:{" "}
                {aiStatus.image?.mode === "live" ? aiStatus.image.model : "35MM-ENGINE"} · VID:{" "}
                {aiStatus.video?.mode === "live" ? aiStatus.video.model : "TIMELINE-WEBM"}
              </div>
            )}
            <button
              type="button"
              disabled={printing}
              onClick={handlePrintReel}
              className="flex items-center gap-2 rounded-[2px] border border-[#7DD8E8] bg-[#7DD8E8]/20 px-5 py-2.5 text-xs font-medium tracking-[0.14em] text-[#F1FCFD] transition hover:bg-[#7DD8E8]/32 disabled:opacity-60"
            >
              <PlayIcon className="h-3.5 w-3.5 text-[#7DD8E8]" />
              {printing ? `母带封片中 ${printProgress}%` : "合成并进入放映室 · PRINT REEL"}
            </button>
          </div>
        </div>

        {/* Severance 4-Bin Stage Completion Bar */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[#9adae8]/14 pt-4 sm:grid-cols-4">
          {STAGES.map((st) => {
            const done = st.id <= completedStage || (printing && st.id === 4);
            const pct =
              st.id < 4
                ? 100
                : printing
                  ? printProgress
                  : draftDream.status === "ready"
                    ? 100
                    : 65;
            return (
              <div
                key={st.id}
                className="rounded-[2px] border border-[#9adae8]/18 bg-[#061117] px-3 py-2"
              >
                <div className="flex items-center justify-between font-reel text-[9px] tracking-[0.16em]">
                  <span className="text-[#7DD8E8]">BIN {st.code}</span>
                  <span className={done ? "text-[#DCECEB]" : "text-[#5E7B85]"}>
                    {pct}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#CFE2E5]">
                  <span>{st.label}</span>
                  <span className="font-reel text-[9px] text-[#607D87]">{st.en}</span>
                </div>
                <div className="mt-2 h-1 w-full bg-[#122631]">
                  <div
                    className="h-full bg-[#7DD8E8] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Darkroom Workspace: Left Contact Sheet + Right Director Inspector */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Left: 35mm Contact Sheet (4 Storyboard Shots) */}
        <div className="space-y-5">
          <div className="lumon-panel overflow-hidden rounded-[2px]">
            <div className="flex items-center justify-between border-b border-[#9adae8]/14 bg-[#07141B] px-4 py-2.5 font-reel text-[10px] tracking-[0.18em] text-[#86A4AD]">
              <span>35MM CONTACT SHEET · 点击任意分镜微调画面与字幕</span>
              <span>{shots.length} KEYFRAMES</span>
            </div>
            <div className="film-sprockets h-4 border-b border-[#9adae8]/10 bg-[#061117]" />

            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {shots.map((shot, idx) => {
                const selected = idx === selectedShotIdx;
                const busy = idx === reexposingIdx;
                return (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => setSelectedShotIdx(idx)}
                    className={`group overflow-hidden rounded-[2px] border text-left transition ${
                      selected
                        ? "border-[#7DD8E8] bg-[#102631] shadow-[0_0_24px_rgba(125,216,232,0.14)]"
                        : "border-[#9adae8]/16 bg-[#07141B] hover:border-[#7DD8E8]/45"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#9adae8]/12 px-3 py-1.5 font-reel text-[9px] tracking-[0.16em]">
                      <span className={selected ? "text-[#7DD8E8]" : "text-[#7A98A1]"}>
                        SHOT 0{idx + 1} · {shot.camera}
                      </span>
                      <span className="text-[#5D7A84]">5.5S</span>
                    </div>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#050D12]">
                      <ShotStillCanvas
                        shot={shot}
                        filmStock={draftDream.filmStock}
                        width={480}
                        height={270}
                        showSubtitle
                        letterbox
                        className={`h-full w-full object-cover transition duration-300 ${
                          busy ? "opacity-40 blur-sm" : "group-hover:scale-[1.02]"
                        }`}
                      />
                      {busy && (
                        <div className="absolute inset-0 grid place-items-center font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
                          RE-EXPOSING...
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#D8E7E9]">
                        {shot.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="film-sprockets h-4 border-t border-[#9adae8]/10 bg-[#061117]" />
          </div>

          {/* Live Film Stock Switcher */}
          <div className="lumon-panel rounded-[2px] p-4">
            <div className="mb-3 flex items-center justify-between font-reel text-[10px] tracking-[0.18em] text-[#86A4AD]">
              <span>切换整卷胶片调色 · LIVE FILM GRADE</span>
              <span className="text-[#7DD8E8]">{currentStock.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FILM_STOCKS.map((stock) => {
                const active = draftDream.filmStock === stock.id;
                return (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => onUpdateDraft({ ...draftDream, filmStock: stock.id })}
                    className={`rounded-[2px] border p-2 text-left transition ${
                      active
                        ? "border-[#7DD8E8] bg-[#112A36]"
                        : "border-[#9adae8]/15 bg-[#061117] hover:border-[#7DD8E8]/40"
                    }`}
                  >
                    <div className="mb-1.5 flex h-2 overflow-hidden rounded-[1px]">
                      {stock.swatch.map((hex) => (
                        <span key={hex} className="flex-1" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                    <div className="truncate text-[11px] text-[#E6F2F2]">{stock.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Director Shot Inspector */}
        {activeShot && (
          <div className="lumon-panel flex flex-col justify-between rounded-[2px] p-5">
            <div>
              <div className="flex items-center justify-between border-b border-[#9adae8]/14 pb-3">
                <div>
                  <div className="font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
                    DIRECTOR INSPECTOR · SHOT 0{selectedShotIdx + 1}
                  </div>
                  <h3 className="mt-1 font-cinema text-lg text-[#EAF4F4]">
                    微调第 {selectedShotIdx + 1} 格梦境画面
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={reexposingIdx === selectedShotIdx}
                  onClick={() => handleReexposeShot(selectedShotIdx)}
                  className="flex items-center gap-1.5 rounded-[2px] border border-[#7DD8E8]/50 bg-[#7DD8E8]/12 px-3 py-1.5 font-reel text-[10px] tracking-[0.14em] text-[#DBF6FA] transition hover:bg-[#7DD8E8]/24 disabled:opacity-50"
                >
                  <RefreshIcon className="h-3.5 w-3.5" />
                  重绘此帧
                </button>
              </div>

              {notice && (
                <div className="mt-3 rounded-[2px] border border-[#7DD8E8]/35 bg-[#7DD8E8]/10 px-3 py-2 text-xs text-[#BCEEF7]">
                  {notice}
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#84A2AC]">
                    场景意象底片 · SCENE ARCHETYPE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCENE_ARCHETYPES.map((arch) => {
                      const active = activeShot.archetype === arch.id;
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => updateShotField(selectedShotIdx, { archetype: arch.id })}
                          className={`rounded-[2px] border px-2.5 py-2 text-left text-xs transition ${
                            active
                              ? "border-[#7DD8E8] bg-[#122D39] text-[#F1FCFD]"
                              : "border-[#9adae8]/15 bg-[#061117] text-[#8AA5AE] hover:border-[#7DD8E8]/40"
                          }`}
                        >
                          <div>{arch.name}</div>
                          <div className="font-reel text-[8px] text-[#5F7E88]">{arch.en}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#84A2AC]">
                    镜头运动 · CAMERA MOVEMENT
                  </label>
                  <select
                    value={activeShot.camera || CAMERA_MOTIONS[0]}
                    onChange={(e) => updateShotField(selectedShotIdx, { camera: e.target.value })}
                    className="w-full rounded-[2px] border border-[#9adae8]/20 bg-[#061117] px-3 py-2 font-reel text-xs text-[#E8F3F3] outline-none focus:border-[#7DD8E8]"
                  >
                    {CAMERA_MOTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#84A2AC]">
                    这一镜的电影字幕 · SUBTITLE
                  </label>
                  <textarea
                    rows={2}
                    value={activeShot.subtitle || ""}
                    onChange={(e) => updateShotField(selectedShotIdx, { subtitle: e.target.value })}
                    className="w-full resize-none rounded-[2px] border border-[#9adae8]/20 bg-[#061117] p-2.5 text-sm text-[#EAF4F4] outline-none focus:border-[#7DD8E8]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#84A2AC]">
                    生图画面描述（供 GPT-Image / 暗房参考） · VISUAL PROMPT
                  </label>
                  <textarea
                    rows={3}
                    value={activeShot.visualPrompt || ""}
                    onChange={(e) =>
                      updateShotField(selectedShotIdx, { visualPrompt: e.target.value })
                    }
                    className="w-full resize-none rounded-[2px] border border-[#9adae8]/20 bg-[#061117] p-2.5 text-xs leading-relaxed text-[#C6DADF] outline-none focus:border-[#7DD8E8]"
                  />
                </div>
              </div>
            </div>

            {/* Original dream reference note */}
            <div className="mt-5 border-t border-[#9adae8]/14 pt-4">
              <div className="flex items-center gap-1.5 font-reel text-[9px] tracking-[0.18em] text-[#6C8A94]">
                <SparkleIcon className="h-3 w-3 text-[#7DD8E8]" />
                <span>醒来原记对照 · ORIGINAL NOTE</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#8AA6AF]">
                {draftDream.rawText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
