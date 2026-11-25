"use client";

import { useEffect, useRef, useState } from "react";
import { DreamAudioEngine } from "../../lib/cinema/audio";
import { getFilmStock } from "../../lib/cinema/presets";
import {
  getDreamDuration,
  renderSequenceFrame,
  SHOT_DURATION_SEC,
} from "../../lib/cinema/renderer";
import { loadAudioBlob } from "../../lib/storage";
import {
  CloseIcon,
  DownloadIcon,
  EditIcon,
  GlobeIcon,
  HeartIcon,
  LockIcon,
  MicIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  TicketIcon,
  TrashIcon,
  VolumeIcon,
} from "../icons/CinemaIcons";
import { ShotStillCanvas } from "./DreamFilmCanvas";

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

export default function CinemaPlayerModal({
  dream,
  currentUser,
  onClose,
  onEditInDarkroom,
  onOpenTicket,
  onToggleVisibility,
  onToggleLike,
  onDelete,
}) {
  const totalDur = getDreamDuration(dream);
  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const audioEngineRef = useRef(null);
  const voiceAudioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [scoreEnabled, setScoreEnabled] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState("");

  const isOwner = Boolean(currentUser && dream?.userId === currentUser.id);
  const stock = getFilmStock(dream?.filmStock);
  const currentShotIndex = Math.min(
    (dream?.shots?.length || 1) - 1,
    Math.floor(currentTime / SHOT_DURATION_SEC),
  );
  const likedBy = dream?.likedBy || [];
  const hasLiked = likedBy.includes(currentUser?.id || "guest-viewer");

  // Load any real generated images
  useEffect(() => {
    imagesRef.current = {};
    (dream?.shots || []).forEach((s) => {
      if (!s.imageUrl) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imagesRef.current[s.id] = img;
      };
      img.src = s.imageUrl;
    });
  }, [dream]);

  // Load saved IndexedDB voice recording if present
  useEffect(() => {
    let url = "";
    let cancelled = false;
    if (dream?.hasVoice) {
      loadAudioBlob(dream.id).then((blob) => {
        if (!cancelled && blob) {
          url = URL.createObjectURL(blob);
          setVoiceUrl(url);
        }
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dream?.id, dream?.hasVoice]);

  // Manage ambient cinema score lifecycle
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new DreamAudioEngine();
    }
    if (scoreEnabled && isPlaying) {
      audioEngineRef.current.start(dream?.mood || "怀旧", 0.22);
    } else {
      audioEngineRef.current.stop();
    }
    return () => {
      audioEngineRef.current?.stop();
    };
  }, [scoreEnabled, isPlaying, dream?.mood]);

  // Esc key to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Main 60fps screening playback loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dream) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();
    let localTime = currentTime;

    const frame = (ts) => {
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;
      if (isPlaying) {
        localTime += dt;
        if (localTime >= totalDur) {
          localTime = 0;
        }
        setCurrentTime(localTime);
      }
      renderSequenceFrame(ctx, canvas.width, canvas.height, dream, localTime, imagesRef.current, {
        showSubtitles,
        showTitleCard: true,
      });
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dream, isPlaying, showSubtitles, totalDur]);

  // Re-render immediately when scrubbed while paused
  useEffect(() => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas || !dream) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderSequenceFrame(ctx, canvas.width, canvas.height, dream, currentTime, imagesRef.current, {
      showSubtitles,
      showTitleCard: true,
    });
  }, [currentTime, isPlaying, dream, showSubtitles]);

  const seekTo = (sec) => {
    const clamped = Math.max(0, Math.min(totalDur - 0.05, sec));
    setCurrentTime(clamped);
    // Re-sync paused canvas immediately
    const canvas = canvasRef.current;
    if (canvas && dream) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        renderSequenceFrame(ctx, canvas.width, canvas.height, dream, clamped, imagesRef.current, {
          showSubtitles,
          showTitleCard: true,
        });
      }
    }
  };

  const toggleVoice = () => {
    if (!voiceAudioRef.current) return;
    if (voicePlaying) {
      voiceAudioRef.current.pause();
      setVoicePlaying(false);
    } else {
      voiceAudioRef.current.play().catch(() => {});
      setVoicePlaying(true);
    }
  };

  // Real browser .webm export of the rendered cinema canvas
  const handleExportVideo = async () => {
    if (dream?.videoUrl) {
      const a = document.createElement("a");
      a.href = dream.videoUrl;
      a.download = `${dream.title || "dream"}.mp4`;
      a.click();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setExportNote("当前浏览器不支持直接导出视频流，你可以先导出高清电影票根 PNG。");
      return;
    }

    setExporting(true);
    setExportNote("正在实时录制梦境 35mm 胶片母带（约 8 秒精选片段）...");
    setIsPlaying(true);
    seekTo(0);

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chaos-dream-${dream.reelCode?.replace(/[^0-9a-z]/gi, "") || "reel"}.webm`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        setExporting(false);
        setExportNote("已成功导出梦境放映视频 (.webm)！");
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 8000);
    } catch {
      setExporting(false);
      setExportNote("视频导出遇到浏览器限制，请重试。");
    }
  };

  // Deterministic Severance 4-Temper breakdown bars derived from dream mood
  const temperProfile = [
    { code: "WO", name: "怅然", pct: dream?.mood === "怅然" ? 78 : dream?.mood === "怀旧" ? 56 : 32 },
    { code: "FC", name: "温暖", pct: dream?.mood === "温暖" ? 84 : dream?.mood === "怀旧" ? 64 : 28 },
    { code: "DR", name: "奇幻", pct: dream?.mood === "奇幻" || dream?.mood === "悬疑" ? 82 : 44 },
    { code: "MA", name: "失重", pct: dream?.mood === "失重" ? 86 : 38 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030A0E]/92 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Top Screening Room Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
            <span className="h-2 w-2 rounded-full bg-[#DAA75A]" />
            <span>SCREENING HALL // {dream.reelCode}</span>
            <span className="hidden sm:inline">· {stock.code}</span>
            <span>· SHOT 0{currentShotIndex + 1}/0{dream.shots?.length || 4}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenTicket(dream)}
              className="flex items-center gap-1.5 rounded-[2px] border border-[#DAA75A]/50 bg-[#DAA75A]/12 px-3 py-1.5 text-xs text-[#F3D9AA] transition hover:bg-[#DAA75A]/24"
            >
              <TicketIcon className="h-3.5 w-3.5" />
              电影票根
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportVideo}
              className="flex items-center gap-1.5 rounded-[2px] border border-[#7DD8E8]/45 bg-[#7DD8E8]/12 px-3 py-1.5 text-xs text-[#DBF6FA] transition hover:bg-[#7DD8E8]/24 disabled:opacity-50"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              {exporting ? "录制中..." : "导出视频"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="退出放映室"
              className="flex items-center gap-1 rounded-[2px] border border-[#9adae8]/20 bg-[#0A1921] px-3 py-1.5 font-reel text-[11px] text-[#9EB7BF] transition hover:border-[#7DD8E8]/50 hover:text-white"
            >
              <CloseIcon className="h-3.5 w-3.5" />
              ESC
            </button>
          </div>
        </div>

        {/* Main Cinema Projector Screen */}
        <div className="lumon-panel overflow-hidden rounded-[2px]">
          <div className="film-sprockets h-4 border-b border-[#9adae8]/12 bg-[#050E13]" />

          <div className="relative aspect-[16/9] w-full bg-[#040B0F]">
            {dream.videoUrl ? (
              <video
                src={dream.videoUrl}
                controls
                autoPlay
                loop
                className="h-full w-full object-cover"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onClick={() => setIsPlaying((p) => !p)}
                className="h-full w-full cursor-pointer object-cover"
              />
            )}
          </div>

          <div className="film-sprockets h-4 border-t border-[#9adae8]/12 bg-[#050E13]" />

          {/* Projector Control Console */}
          {!dream.videoUrl && (
            <div className="border-t border-[#9adae8]/14 bg-[#07141B] px-4 py-3.5 sm:px-5">
              {/* Timeline Scrubber */}
              <div className="mb-3 flex items-center gap-3">
                <span className="w-11 font-reel text-[10px] text-[#8CA7B0]">
                  {formatClock(currentTime)}
                </span>
                <div className="relative flex-1">
                  <input
                    type="range"
                    min={0}
                    max={totalDur}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-none bg-[#122833] accent-[#7DD8E8]"
                    aria-label="影片播放进度"
                  />
                </div>
                <span className="w-11 text-right font-reel text-[10px] text-[#6B8791]">
                  {formatClock(totalDur)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="flex items-center gap-1.5 rounded-[2px] border border-[#7DD8E8]/60 bg-[#7DD8E8]/18 px-3.5 py-1.5 text-xs text-[#EFFBFC] transition hover:bg-[#7DD8E8]/28"
                  >
                    {isPlaying ? (
                      <>
                        <PauseIcon className="h-3.5 w-3.5" /> 暂停
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-3.5 w-3.5" /> 放映
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setScoreEnabled((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-xs transition ${
                      scoreEnabled
                        ? "border-[#7DD8E8]/55 bg-[#7DD8E8]/14 text-[#DEF7FB]"
                        : "border-[#9adae8]/18 bg-[#0A1921] text-[#87A2AB] hover:text-[#DCEBEF]"
                    }`}
                  >
                    {scoreEnabled ? (
                      <VolumeIcon className="h-3.5 w-3.5 text-[#7DD8E8]" />
                    ) : (
                      <MuteIcon className="h-3.5 w-3.5" />
                    )}
                    影院配乐
                  </button>

                  {voiceUrl && (
                    <>
                      <audio
                        ref={voiceAudioRef}
                        src={voiceUrl}
                        onEnded={() => setVoicePlaying(false)}
                      />
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-xs transition ${
                          voicePlaying
                            ? "border-[#DAA75A] bg-[#DAA75A]/18 text-[#F8E2BC]"
                            : "border-[#DAA75A]/35 bg-[#0A1921] text-[#DFC293]"
                        }`}
                      >
                        <MicIcon className="h-3.5 w-3.5" />
                        {voicePlaying ? "暂停醒来原声" : "播放醒来原声"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSubtitles((v) => !v)}
                    className={`rounded-[2px] border px-2.5 py-1.5 font-reel text-[10px] tracking-[0.12em] transition ${
                      showSubtitles
                        ? "border-[#7DD8E8]/40 text-[#BEEFF8]"
                        : "border-[#9adae8]/15 text-[#698690]"
                    }`}
                  >
                    字幕 {showSubtitles ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLike(dream.id)}
                    className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-xs transition ${
                      hasLiked
                        ? "border-[#DAA75A]/60 bg-[#DAA75A]/14 text-[#F3D5A0]"
                        : "border-[#9adae8]/18 text-[#93ADB6] hover:text-white"
                    }`}
                  >
                    <HeartIcon className="h-3.5 w-3.5" filled={hasLiked} />
                    共鸣 {dream.likes || 0}
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditInDarkroom(dream)}
                        className="flex items-center gap-1 rounded-[2px] border border-[#9adae8]/20 bg-[#0A1921] px-3 py-1.5 text-xs text-[#C6DCE0] transition hover:border-[#7DD8E8]/50"
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                        暗房重剪
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(dream.id)}
                        className="flex items-center gap-1 rounded-[2px] border border-[#9adae8]/20 bg-[#0A1921] px-3 py-1.5 text-xs text-[#C6DCE0] transition hover:border-[#7DD8E8]/50"
                      >
                        {dream.visibility === "private" ? (
                          <>
                            <LockIcon className="h-3.5 w-3.5" /> 转为公开
                          </>
                        ) : (
                          <>
                            <GlobeIcon className="h-3.5 w-3.5" /> 转为私密
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(dream.id)}
                        title="删除这卷胶片"
                        className="rounded-[2px] border border-[#CF564A]/30 bg-[#0A1921] p-1.5 text-[#DF867C] transition hover:bg-[#CF564A]/20"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {exportNote && (
                <div className="mt-2.5 font-reel text-[10px] text-[#7DD8E8]">{exportNote}</div>
              )}
            </div>
          )}
        </div>

        {/* 35mm Contact Strip Selector */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(dream.shots || []).map((shot, idx) => {
            const active = idx === currentShotIndex;
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => seekTo(idx * SHOT_DURATION_SEC + 0.1)}
                className={`overflow-hidden rounded-[2px] border text-left transition ${
                  active
                    ? "border-[#7DD8E8] bg-[#0F2631]"
                    : "border-[#9adae8]/15 bg-[#08151C] opacity-75 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between px-2.5 py-1 font-reel text-[9px] text-[#7D9BA5]">
                  <span className={active ? "text-[#7DD8E8]" : ""}>SHOT 0{idx + 1}</span>
                  <span>{formatClock(idx * SHOT_DURATION_SEC)}</span>
                </div>
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <ShotStillCanvas
                    shot={shot}
                    filmStock={dream.filmStock}
                    width={320}
                    height={180}
                    letterbox
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Story Archive & Severance 4-Bin Temper Breakdown */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="lumon-panel rounded-[2px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 font-reel text-[10px] tracking-[0.18em] text-[#7DD8E8]">
              <span>ARCHIVED MEMORY SCRIPT · 醒来原记</span>
              <span className="text-[#84A1AA]">
                {dream.dreamDate} · {dream.authorName}
              </span>
            </div>
            <h2 className="mt-2.5 font-cinema text-2xl text-[#EFF7F7]">{dream.title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#C4D7DB]">
              {dream.rawText}
            </p>
            {dream.symbols?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {dream.symbols.map((sym) => (
                  <span
                    key={sym}
                    className="rounded-[2px] border border-[#9adae8]/18 bg-[#061117] px-2.5 py-1 font-reel text-[10px] text-[#95B5BE]"
                  >
                    # {sym}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="lumon-panel flex flex-col justify-between rounded-[2px] p-5 sm:p-6">
            <div>
              <div className="font-reel text-[10px] tracking-[0.18em] text-[#7DD8E8]">
                REM RESONANCE BINS · 梦境情绪成分
              </div>
              <p className="mt-3 text-xs leading-6 text-[#A3BCC4]">{dream.interpretation}</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {temperProfile.map((item) => (
                  <div
                    key={item.code}
                    className="rounded-[2px] border border-[#9adae8]/16 bg-[#061117] p-2.5"
                  >
                    <div className="flex items-center justify-between font-reel text-[9px] tracking-[0.15em]">
                      <span className="text-[#7DD8E8]">{item.code}</span>
                      <span className="text-[#9AB5BD]">{item.pct}%</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#DCEAEB]">{item.name}</div>
                    <div className="mt-2 h-1 bg-[#122631]">
                      <div
                        className="h-full bg-[#7DD8E8]"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-[#9adae8]/12 pt-3 font-reel text-[10px] tracking-[0.14em] text-[#6B8891]">
              STOCK: {stock.enName} ({stock.code})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
