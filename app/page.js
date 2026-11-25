"use client";

import { useEffect, useMemo, useState } from "react";
import AuthModal from "../components/auth/AuthModal";
import CaptureStudio from "../components/capture/CaptureStudio";
import DarkroomWorkbench from "../components/darkroom/DarkroomWorkbench";
import { PlusIcon } from "../components/icons/CinemaIcons";
import CinemaPlayerModal from "../components/player/CinemaPlayerModal";
import DreamTicketModal from "../components/player/DreamTicketModal";
import ActiveLiquidStage from "../components/stage/ActiveLiquidStage";
import { MOOD_OPTIONS } from "../lib/cinema/presets";
import {
  deleteDreamById,
  ensureSeedData,
  generateNextReelCode,
  getAllDreams,
  getCurrentUser,
  logoutUser,
  saveAudioBlob,
  saveDream,
  SEED_DREAMS,
  toggleDreamLike,
} from "../lib/storage";

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dreams, setDreams] = useState(SEED_DREAMS);
  const [activeScope, setActiveScope] = useState("screening"); // "screening" | "mine" | "darkroom"
  const [selectedMood, setSelectedMood] = useState("全部");
  const [focusedDream, setFocusedDream] = useState(null);

  const [authModalMode, setAuthModalMode] = useState(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [draftDream, setDraftDream] = useState(null);
  const [playingDreamId, setPlayingDreamId] = useState(null);
  const [ticketDream, setTicketDream] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [accountMenu, setAccountMenu] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    ensureSeedData();
    setCurrentUser(getCurrentUser());
    setDreams(getAllDreams());
    setHydrated(true);

    fetch("/api/dream/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setAiStatus(d.providers);
      })
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? "" : prev));
    }, 3400);
  };

  const myDreamsCount = useMemo(() => {
    if (!currentUser) return 0;
    return dreams.filter((d) => d.userId === currentUser.id).length;
  }, [dreams, currentUser]);

  const visibleDreams = useMemo(() => {
    const base =
      activeScope === "mine"
        ? currentUser
          ? dreams.filter((d) => d.userId === currentUser.id)
          : []
        : dreams.filter(
            (d) =>
              d.visibility === "public" ||
              (currentUser && d.userId === currentUser.id),
          );
    if (selectedMood === "全部") return base;
    return base.filter((d) => d.mood === selectedMood);
  }, [dreams, activeScope, currentUser, selectedMood]);

  const playingDream = useMemo(
    () => dreams.find((d) => d.id === playingDreamId) || null,
    [dreams, playingDreamId],
  );

  const handleCaptureSubmit = async ({
    title,
    rawText,
    dreamDate,
    mood,
    filmStock,
    visibility,
    audioBlob,
  }) => {
    const res = await fetch("/api/dream/develop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, rawText, mood, filmStock }),
    });
    const data = await res.json();
    if (!data?.ok || !data.result) {
      throw new Error(data?.error || "暗房解析失败");
    }

    const developed = data.result;
    const dreamId = `dream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (audioBlob) {
      await saveAudioBlob(dreamId, audioBlob);
    }

    const newDream = {
      id: dreamId,
      reelCode: generateNextReelCode(dreams),
      userId: currentUser?.id || "guest-visitor",
      authorName: currentUser?.name || "访客造梦者",
      authorBadge: currentUser?.badge || "GUEST PASS",
      title: developed.title,
      enTitle: developed.enTitle,
      dreamDate,
      mood,
      filmStock: developed.filmStock || filmStock,
      visibility: currentUser ? visibility : "public",
      status: "draft",
      rawText,
      summary: developed.summary,
      interpretation: developed.interpretation,
      symbols: developed.symbols || [],
      hasVoice: Boolean(audioBlob),
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      shots: developed.shots || [],
    };

    saveDream(newDream);
    setDreams(getAllDreams());
    setDraftDream(newDream);
    setCaptureOpen(false);
    setActiveScope("darkroom");
    showToast("已解析 4 格梦境分镜，封片后会作为新光球浮现在水波暗室中。");
  };

  const handleUpdateDraft = (updated) => {
    setDraftDream(updated);
    saveDream(updated);
    setDreams(getAllDreams());
  };

  const handlePrintFinalReel = (printed) => {
    saveDream(printed);
    setDreams(getAllDreams());
    setDraftDream(printed);
    setActiveScope("screening");
    setPlayingDreamId(printed.id);
    showToast(`《${printed.title}》已完成 35mm 封片。`);
  };

  const handleToggleLike = (dreamId) => {
    setDreams(toggleDreamLike(dreamId, currentUser?.id || "guest-viewer"));
  };

  const handleToggleVisibility = (dreamId) => {
    const target = dreams.find((d) => d.id === dreamId);
    if (!target) return;
    const nextVis = target.visibility === "private" ? "public" : "private";
    saveDream({ ...target, visibility: nextVis });
    setDreams(getAllDreams());
    showToast(nextVis === "public" ? "已公开放映。" : "已转为私密典藏。");
  };

  const handleDeleteDream = (dreamId) => {
    setDreams(deleteDreamById(dreamId));
    if (playingDreamId === dreamId) setPlayingDreamId(null);
    if (draftDream?.id === dreamId) setDraftDream(null);
    showToast("已移出该卷梦境胶片。");
  };

  const subtitleDream = focusedDream || visibleDreams[0] || null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#030507] text-[#F2EDE4]">
      {/* Full-Bleed Top Editorial Bar (Zero boxes, pure A24 / Active Theory typography) */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-9 sm:py-6">
        <button
          type="button"
          onClick={() => setActiveScope("screening")}
          className="pointer-events-auto group flex items-center gap-3 text-left outline-none"
        >
          <span className="h-2 w-2 rounded-full bg-[#D9B684] opacity-85 transition group-hover:scale-125" />
          <span className="font-reel text-[11px] tracking-[0.3em] text-[#F2EDE4]/90">
            CHAOS DREAM LAB
          </span>
          <span className="hidden font-reel text-[10px] tracking-[0.2em] text-[#F2EDE4]/35 md:inline">
            // {String(visibleDreams.length).padStart(2, "0")} REELS
          </span>
        </button>

        <nav className="pointer-events-auto flex items-center gap-5 text-xs tracking-[0.14em] sm:gap-7">
          <button
            type="button"
            onClick={() => setActiveScope("screening")}
            className={`transition ${
              activeScope === "screening"
                ? "text-[#F7F2EA]"
                : "text-[#F2EDE4]/45 hover:text-[#F2EDE4]/85"
            }`}
          >
            暗室放映
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("mine")}
            className={`transition ${
              activeScope === "mine"
                ? "text-[#F7F2EA]"
                : "text-[#F2EDE4]/45 hover:text-[#F2EDE4]/85"
            }`}
          >
            我的梦境
            {myDreamsCount > 0 && (
              <span className="ml-1 font-reel text-[10px] text-[#D9B684]">
                {String(myDreamsCount).padStart(2, "0")}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("darkroom")}
            className={`relative transition ${
              activeScope === "darkroom"
                ? "text-[#F7F2EA]"
                : "text-[#F2EDE4]/45 hover:text-[#F2EDE4]/85"
            }`}
          >
            暗房
            {draftDream && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#7DD8E8] align-middle" />
            )}
          </button>

          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenu((v) => !v)}
                className="font-reel text-[11px] tracking-[0.12em] text-[#D9B684] transition hover:text-[#F5E1BE]"
              >
                {currentUser.name}
              </button>
              {accountMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountMenu(false)} />
                  <div className="absolute right-0 z-50 mt-3 w-48 border border-white/12 bg-[#080C0F]/95 p-2 text-xs backdrop-blur-md">
                    <div className="border-b border-white/10 px-2.5 py-2 font-reel text-[9px] tracking-[0.16em] text-white/45">
                      {currentUser.badge}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenu(false);
                        setAuthModalMode("login");
                      }}
                      className="mt-1 block w-full px-2.5 py-1.5 text-left text-white/75 hover:bg-white/5 hover:text-white"
                    >
                      切换 / 注册账号
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenu(false);
                        logoutUser();
                        setCurrentUser(null);
                        if (activeScope === "mine") setActiveScope("screening");
                        showToast("已退出当前通行证。");
                      }}
                      className="block w-full px-2.5 py-1.5 text-left text-[#E37E74] hover:bg-white/5"
                    >
                      退出通行证
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalMode("login")}
              className="text-[#F2EDE4]/55 transition hover:text-[#F7F2EA]"
            >
              通行证
            </button>
          )}
        </nav>
      </header>

      {/* Main Content: Either Full-Bleed Active Theory Liquid Stage OR Focused Darkroom */}
      {activeScope === "darkroom" ? (
        <main className="lumon-grid-bg h-full w-full overflow-y-auto bg-[#061117] pt-16">
          <DarkroomWorkbench
            draftDream={draftDream}
            onUpdateDraft={handleUpdateDraft}
            onPrintFinalReel={handlePrintFinalReel}
            onOpenCapture={() => setCaptureOpen(true)}
            aiStatus={aiStatus}
          />
        </main>
      ) : (
        <main className="relative h-full w-full overflow-hidden">
          {hydrated && (
            <ActiveLiquidStage
              dreams={visibleDreams}
              onSelectDream={(d) => setPlayingDreamId(d.id)}
              onOpenTicket={(d) => setTicketDream(d)}
              onFocusDreamChange={setFocusedDream}
            />
          )}

          {/* Whisper-thin mood selector on far-right vertical edge (desktop) */}
          <div className="pointer-events-auto fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2.5 md:flex">
            {["全部", ...MOOD_OPTIONS.map((m) => m.id)].map((m) => {
              const act = selectedMood === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMood(m)}
                  className={`font-reel text-[10px] tracking-[0.18em] transition ${
                    act
                      ? "text-[#F4EEE4]"
                      : "text-[#F2EDE4]/28 hover:text-[#F2EDE4]/70"
                  }`}
                >
                  {act ? `— ${m}` : m}
                </button>
              );
            })}
          </div>

          {/* Private vault sign-in prompt if not logged in */}
          {hydrated && activeScope === "mine" && !currentUser && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-[#030507]/65 p-6 backdrop-blur-sm">
              <div className="max-w-sm border border-white/12 bg-[#070B0E]/92 p-7 text-center">
                <div className="font-reel text-[10px] tracking-[0.24em] text-[#D9B684]">
                  PRIVATE REM VAULT
                </div>
                <h2 className="mt-2 font-cinema text-xl text-[#F5F0E7]">
                  登录后开启你的私人梦境水面
                </h2>
                <p className="mt-2.5 text-xs leading-relaxed text-white/55">
                  你封存的私密梦境光球只会浮现在只属于你的这片暗室之中。
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthModalMode("register")}
                    className="border border-white/75 bg-white/95 px-5 py-2 text-xs font-medium tracking-[0.14em] text-[#070A0C] transition hover:bg-white"
                  >
                    注册通行证
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode("login")}
                    className="border border-white/20 px-5 py-2 text-xs tracking-[0.14em] text-white/80 transition hover:border-white/50"
                  >
                    登录
                  </button>
                </div>
              </div>
            </div>
          )}

          {hydrated && activeScope === "mine" && currentUser && visibleDreams.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4">
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-5 py-2.5 text-xs tracking-[0.14em] text-white/85 backdrop-blur-md transition hover:border-white/50"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                你的私人暗室还是空的 · 录下第一场梦
              </button>
            </div>
          )}

          {/* Bottom Editorial Cinema Subtitle + Minimal Record Trigger */}
          <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 px-6 pb-6 sm:px-9 sm:pb-7">
            <div className="max-w-md">
              {subtitleDream ? (
                <>
                  <div className="font-reel text-[9px] tracking-[0.24em] text-[#D9B684]/85">
                    {focusedDream ? "FOCUSED DREAM · " : "ARCHIVED · "}
                    {subtitleDream.reelCode} · {subtitleDream.dreamDate} · {subtitleDream.authorName}
                  </div>
                  <div className="mt-1 font-cinema text-lg tracking-[0.06em] text-[#F6F1E8] sm:text-xl">
                    {subtitleDream.title}
                  </div>
                  <p className="mt-1 hidden truncate text-xs text-[#F2EDE4]/48 sm:block">
                    {subtitleDream.summary || subtitleDream.rawText}
                  </p>
                </>
              ) : (
                <div className="font-reel text-[10px] tracking-[0.2em] text-white/40">
                  滑动水面感受涟漪与凝视 · 点击梦境球进入 35MM 放映
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              className="pointer-events-auto group flex shrink-0 items-center gap-2.5 rounded-full border border-white/18 bg-[#0A0C0E]/75 px-5 py-2.5 text-xs tracking-[0.16em] text-[#F5EFE6] backdrop-blur-md transition duration-300 hover:border-white/45 hover:bg-[#121619]/90"
            >
              <span className="h-2 w-2 rounded-full bg-[#D24B3F] animate-rec-pulse" />
              <span>捕梦</span>
              <span className="hidden font-reel text-[10px] tracking-[0.18em] text-white/50 sm:inline">
                RECORD
              </span>
            </button>
          </footer>
        </main>
      )}

      {/* Modals */}
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setAuthModalMode(null);
            showToast(`欢迎回到暗室，${user.name}`);
          }}
        />
      )}

      {captureOpen && (
        <CaptureStudio
          currentUser={currentUser}
          onClose={() => setCaptureOpen(false)}
          onSubmitCapture={handleCaptureSubmit}
          onNeedAuth={() => {
            setCaptureOpen(false);
            setAuthModalMode("register");
          }}
        />
      )}

      {playingDream && (
        <CinemaPlayerModal
          dream={playingDream}
          currentUser={currentUser}
          onClose={() => setPlayingDreamId(null)}
          onEditInDarkroom={(d) => {
            setDraftDream(d);
            setPlayingDreamId(null);
            setActiveScope("darkroom");
          }}
          onOpenTicket={(d) => setTicketDream(d)}
          onToggleVisibility={handleToggleVisibility}
          onToggleLike={handleToggleLike}
          onDelete={handleDeleteDream}
        />
      )}

      {ticketDream && (
        <DreamTicketModal
          dream={ticketDream}
          onClose={() => setTicketDream(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-white/18 bg-[#090D10]/92 px-5 py-2 text-xs tracking-[0.06em] text-[#F3EEE5] shadow-2xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}
