"use client";

import { useEffect, useRef, useState } from "react";
import { FILM_STOCKS, MOOD_OPTIONS } from "../../lib/cinema/presets";
import {
  CloseIcon,
  GlobeIcon,
  LockIcon,
  MicIcon,
  SparkleIcon,
  StopIcon,
} from "../icons/CinemaIcons";

const QUICK_PROMPTS = [
  "凌晨四点，我坐在一列浸在海面里的旧电车上，窗外全是黄昏的云。",
  "推开老教室的门，里面下着很安静的雪，黑板上留着没写完的一句话。",
  "我在一条极度对称的荧光白走廊里一直往前走，尽头的门后面传来海浪声。",
];

function formatDuration(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function CaptureStudio({
  currentUser,
  onClose,
  onSubmitCapture,
  onNeedAuth,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [dreamDate, setDreamDate] = useState(today);
  const [mood, setMood] = useState("怀旧");
  const [filmStock, setFilmStock] = useState("lumon-35mm");
  const [visibility, setVisibility] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const waveCanvasRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const waveRafRef = useRef(0);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveRafRef.current) {
      window.cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = 0;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startWaveform = (stream) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !waveCanvasRef.current) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      const canvas = waveCanvasRef.current;
      if (!canvas) return;
      const c2d = canvas.getContext("2d");
      if (!c2d) return;
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      c2d.fillStyle = "#061117";
      c2d.fillRect(0, 0, w, h);

      const barCount = 28;
      const gap = 3;
      const barW = (w - gap * (barCount - 1)) / barCount;
      for (let i = 0; i < barCount; i += 1) {
        const val = data[i % data.length] / 255;
        const barH = Math.max(4, val * (h - 8));
        c2d.fillStyle = val > 0.55 ? "#7DD8E8" : "rgba(125, 216, 232, 0.45)";
        c2d.fillRect(i * (barW + gap), (h - barH) / 2, barW, barH);
      }
      waveRafRef.current = window.requestAnimationFrame(draw);
    };
    draw();
  };

  const startRecording = async () => {
    setError("");
    setVoiceNote("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器环境不支持麦克风录音，你可以直接用下方文本框记录梦境。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Try cloud ASR route if configured in .env
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "dream-voice.webm");
          const res = await fetch("/api/dream/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data?.mode === "live" && data?.text) {
            setRawText((prev) => (prev ? `${prev}\n${data.text}` : data.text));
            setVoiceNote("云端 ASR 已将语音自动转写到梦境原记，原声已保留。");
          } else {
            setVoiceNote("醒来原声已保存，放映时可开启原声回放；你也可以在下方补充或微调文字。");
          }
        } catch {
          setVoiceNote("醒来原声已本地保存，可在下方补充文字描述。");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      startWaveform(stream);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);

      // Optional browser live SpeechRecognition for instant dictation
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = "zh-CN";
          rec.continuous = true;
          rec.interimResults = false;
          rec.onresult = (event) => {
            let appended = "";
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              if (event.results[i].isFinal) {
                appended += event.results[i][0].transcript;
              }
            }
            if (appended.trim()) {
              setRawText((prev) => (prev ? `${prev}${appended}` : appended));
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch {
          // SpeechRecognition optional
        }
      }
    } catch {
      setError("无法访问麦克风，请检查浏览器权限，或直接通过文字记录梦境。");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopRecordingCleanup();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isRecording) {
      stopRecording();
    }
    const cleanText = rawText.trim();
    if (!cleanText && !audioBlob) {
      setError("请写下几句梦境片段，或者先录一段醒来语音。");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitCapture({
        title: title.trim(),
        rawText: cleanText || "（由醒来语音原声记录的梦境碎片）",
        dreamDate,
        mood,
        filmStock,
        visibility: currentUser ? visibility : "public",
        audioBlob,
      });
    } catch (err) {
      setError(err?.message || "送入暗房显影失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#030A0E]/85 p-4 backdrop-blur-md">
      <div className="lumon-panel relative my-auto w-full max-w-3xl rounded-[2px]">
        {/* Top Severance Terminal File Bar */}
        <div className="flex items-center justify-between border-b border-[#9adae8]/18 bg-[#07141B] px-5 py-3">
          <div className="flex items-center gap-3 font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
            <span className="h-2 w-2 rounded-full bg-[#CF564A] animate-rec-pulse" />
            <span>INTAKE TERMINAL // 捕梦室 · CAPTURE WAKING MEMORY</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭捕梦室"
            className="rounded-[2px] p-1 text-[#7D9AA3] transition hover:bg-[#132833] hover:text-[#EAF4F4]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="lumon-double-rule mx-5 mt-3 opacity-60" />

        <form onSubmit={handleSubmit} className="p-5 sm:p-7">
          {!currentUser && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-[#DAA75A]/35 bg-[#DAA75A]/10 px-3.5 py-2.5 text-xs text-[#F2D9AE]">
              <span>当前为访客体验模式，登录后可归档到你的专属胶片库并设置私密可见。</span>
              <button
                type="button"
                onClick={onNeedAuth}
                className="font-reel text-[11px] underline underline-offset-4 hover:text-white"
              >
                去登录 / 注册 →
              </button>
            </div>
          )}

          {/* Voice Recorder Strip */}
          <div className="mb-5 rounded-[2px] border border-[#9adae8]/18 bg-[#07141B] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-reel text-[10px] tracking-[0.18em] text-[#7DD8E8]">
                  AUDIO CAPTURE · 醒来语音速记（支持边说边转文字 + 永久保留原声）
                </div>
                <div className="mt-1 text-xs text-[#88A3AC]">
                  {isRecording
                    ? `正在录制醒来原声 · ${formatDuration(recordSeconds)}（支持中文实时语音听写）`
                    : audioUrl
                      ? `已录制一段 ${formatDuration(recordSeconds)} 的原声记忆，可试听或重录`
                      : "刚醒来不想打字？按下麦克风直接说出梦里的零散画面即可"}
                </div>
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 rounded-[2px] border border-[#CF564A]/65 bg-[#CF564A]/18 px-4 py-2 text-xs font-medium tracking-[0.12em] text-[#FCEAE8] transition hover:bg-[#CF564A]/30"
                >
                  <MicIcon className="h-4 w-4 text-[#F38C82]" />
                  {audioUrl ? "重新录音" : "开始录音 · REC"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-[2px] border border-[#CF564A] bg-[#CF564A] px-4 py-2 text-xs font-medium tracking-[0.12em] text-white transition hover:brightness-110"
                >
                  <StopIcon className="h-3.5 w-3.5" />
                  停止录音 · {formatDuration(recordSeconds)}
                </button>
              )}
            </div>

            {isRecording && (
              <div className="mt-3 overflow-hidden rounded-[2px] border border-[#7DD8E8]/25 bg-[#061117] p-2">
                <canvas ref={waveCanvasRef} width={640} height={44} className="h-11 w-full" />
              </div>
            )}

            {audioUrl && !isRecording && (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#9adae8]/12 pt-3">
                <audio controls src={audioUrl} className="h-8 flex-1" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl("");
                    setAudioBlob(null);
                    setVoiceNote("");
                  }}
                  className="font-reel text-[10px] text-[#8FA8B0] hover:text-[#F09A91]"
                >
                  清除录音
                </button>
              </div>
            )}

            {(transcribing || voiceNote) && (
              <div className="mt-2 font-reel text-[10px] text-[#7DD8E8]">
                {transcribing ? "正在尝试转写语音..." : voiceNote}
              </div>
            )}
          </div>

          {/* Writing Area */}
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <label className="mb-1.5 block font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
                梦境片名（选填，留空由暗房 AI 自动拟题） · REEL TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：凌晨四点的水下电车"
                className="w-full rounded-[2px] border border-[#9adae8]/20 bg-[#061117] px-3.5 py-2.5 font-cinema text-base text-[#EAF4F4] outline-none transition placeholder:text-[#4F6B75] focus:border-[#7DD8E8]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
                梦境日期 · DATE
              </label>
              <input
                type="date"
                value={dreamDate}
                onChange={(e) => setDreamDate(e.target.value)}
                className="w-full rounded-[2px] border border-[#9adae8]/20 bg-[#061117] px-3 py-2.5 font-reel text-xs text-[#EAF4F4] outline-none transition focus:border-[#7DD8E8]"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
                梦境原记 · RAW MEMORY FRAGMENTS
              </label>
              <button
                type="button"
                onClick={() => {
                  const pick = QUICK_PROMPTS[Math.floor(Math.random() * QUICK_PROMPTS.length)];
                  setRawText(pick);
                }}
                className="font-reel text-[10px] tracking-[0.12em] text-[#7DD8E8] hover:underline"
              >
                填入灵感片段试一试
              </button>
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="不需要写得有逻辑——写下你记得的场景、光线、天气、出现的人、说过的只言片语，暗房会帮你梳理成 4 格电影分镜..."
              className="w-full resize-none rounded-[2px] border border-[#9adae8]/20 bg-[#061117] p-3.5 text-sm leading-relaxed text-[#EAF4F4] outline-none transition placeholder:text-[#4F6B75] focus:border-[#7DD8E8]"
            />
          </div>

          {/* Mood & Visibility Row */}
          <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-2 font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
                情绪共振 · TEMPER RESONANCE
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((m) => {
                  const active = mood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={`rounded-[2px] border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-[#7DD8E8] bg-[#7DD8E8]/18 text-[#F2FCFD]"
                          : "border-[#9adae8]/16 bg-[#07141B] text-[#8CA6AF] hover:border-[#7DD8E8]/45"
                      }`}
                    >
                      {m.id}
                      <span className="ml-1 font-reel text-[9px] text-[#66848E]">
                        {m.en.slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
                放映权限 · VISIBILITY
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex items-center justify-center gap-1.5 rounded-[2px] border py-2 text-xs transition ${
                    visibility === "public"
                      ? "border-[#7DD8E8] bg-[#7DD8E8]/16 text-[#EEF9FB]"
                      : "border-[#9adae8]/16 bg-[#07141B] text-[#86A1AA]"
                  }`}
                >
                  <GlobeIcon className="h-3.5 w-3.5" />
                  公开放映
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  disabled={!currentUser}
                  className={`flex items-center justify-center gap-1.5 rounded-[2px] border py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    visibility === "private"
                      ? "border-[#DAA75A] bg-[#DAA75A]/16 text-[#F8E2BC]"
                      : "border-[#9adae8]/16 bg-[#07141B] text-[#86A1AA]"
                  }`}
                >
                  <LockIcon className="h-3.5 w-3.5" />
                  私密典藏
                </button>
              </div>
            </div>
          </div>

          {/* Film Stock Selector */}
          <div className="mt-5">
            <div className="mb-2 font-reel text-[10px] tracking-[0.18em] text-[#8EAAB3]">
              35MM 胶片预设 · FILM STOCK EMULSION
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FILM_STOCKS.map((stock) => {
                const active = filmStock === stock.id;
                return (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => setFilmStock(stock.id)}
                    className={`rounded-[2px] border p-2.5 text-left transition ${
                      active
                        ? "border-[#7DD8E8] bg-[#102732]"
                        : "border-[#9adae8]/15 bg-[#07141B] hover:border-[#7DD8E8]/40"
                    }`}
                  >
                    <div className="mb-2 flex h-2.5 overflow-hidden rounded-[1px]">
                      {stock.swatch.map((hex) => (
                        <span
                          key={hex}
                          className="flex-1"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <div className="truncate text-[11px] font-medium text-[#E8F3F3]">
                      {stock.name}
                    </div>
                    <div className="mt-0.5 font-reel text-[9px] text-[#6B8891]">
                      {stock.code}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-[2px] border border-[#CF564A]/50 bg-[#CF564A]/12 px-3.5 py-2 text-xs text-[#F4ACA4]">
              {error}
            </div>
          )}

          {/* Footer Submit */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#9adae8]/14 pt-5">
            <span className="font-reel text-[10px] tracking-[0.14em] text-[#66848E]">
              下一步：进入暗房显影台审阅并微调 4 格分镜
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[2px] border border-[#9adae8]/18 px-4 py-2.5 text-xs text-[#91ABB3] transition hover:text-[#EAF4F4]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-[2px] border border-[#7DD8E8] bg-[#7DD8E8]/20 px-5 py-2.5 text-xs font-medium tracking-[0.14em] text-[#F1FCFD] transition hover:bg-[#7DD8E8]/32 disabled:opacity-50"
              >
                <SparkleIcon className="h-3.5 w-3.5 text-[#7DD8E8]" />
                {submitting ? "正在送入暗房显影..." : "送入暗房显影 · DEVELOP"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
