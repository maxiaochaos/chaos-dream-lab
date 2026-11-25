"use client";

import { useState } from "react";
import { loginUser, quickLoginDemo, registerUser } from "../../lib/storage";
import { CloseIcon, LumonMark } from "../icons/CinemaIcons";

export default function AuthModal({ initialMode = "login", onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user =
        mode === "register"
          ? await registerUser({ name, email, password, bio })
          : await loginUser({ email, password });
      onSuccess(user);
    } catch (err) {
      setError(err?.message || "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = (userId) => {
    const user = quickLoginDemo(userId);
    if (user) onSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04090A]/80 p-4 backdrop-blur-md">
      <div className="lumon-panel relative w-full max-w-md rounded-[2px] p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 rounded-[2px] p-1.5 text-[#7F958F] transition hover:bg-[#17272B] hover:text-[#E8EFEA]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <LumonMark className="h-7 w-7 text-[#6FD3C4]" />
          <div>
            <div className="font-reel text-[10px] tracking-[0.2em] text-[#6FD3C4]">
              CHAOS DREAM LAB · ACCESS PASS
            </div>
            <h2 className="mt-0.5 font-cinema text-xl text-[#E8EFEA]">
              {mode === "register" ? "签发梦境档案通行证" : "验证放映厅通行证"}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#8FA39D]">
          注册后即可拥有独立的私人胶片库（仅自己可见），也可将珍藏的梦境选择公开放映。当前账号与梦境记录安全保存在本机浏览器存储中。
        </p>

        {/* Mode toggle */}
        <div className="mt-5 grid grid-cols-2 border border-[#b4d4cc]/15 bg-[#091214] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`py-2 font-reel text-[11px] tracking-[0.14em] transition ${
              mode === "login"
                ? "bg-[#15262B] text-[#E8EFEA]"
                : "text-[#7A908A] hover:text-[#BFD1CB]"
            }`}
          >
            登录 · SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`py-2 font-reel text-[11px] tracking-[0.14em] transition ${
              mode === "register"
                ? "bg-[#15262B] text-[#E8EFEA]"
                : "text-[#7A908A] hover:text-[#BFD1CB]"
            }`}
          >
            注册 · REGISTER
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#8FA39D]">
                造梦者署名的昵称 · SUBJECT NAME
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：陈默 / 拾梦者"
                className="w-full rounded-[2px] border border-[#b4d4cc]/20 bg-[#081012] px-3 py-2.5 text-sm text-[#E8EFEA] outline-none transition placeholder:text-[#526661] focus:border-[#6FD3C4]"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#8FA39D]">
              档案邮箱 · EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-[2px] border border-[#b4d4cc]/20 bg-[#081012] px-3 py-2.5 text-sm text-[#E8EFEA] outline-none transition placeholder:text-[#526661] focus:border-[#6FD3C4]"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#8FA39D]">
              通行密码 · PASSCODE
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 4 位字符"
              className="w-full rounded-[2px] border border-[#b4d4cc]/20 bg-[#081012] px-3 py-2.5 text-sm text-[#E8EFEA] outline-none transition placeholder:text-[#526661] focus:border-[#6FD3C4]"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1.5 block font-reel text-[10px] tracking-[0.16em] text-[#8FA39D]">
                个人注脚（选填） · ARCHIVE NOTE
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="一句话记录你常做的梦"
                className="w-full rounded-[2px] border border-[#b4d4cc]/20 bg-[#081012] px-3 py-2.5 text-sm text-[#E8EFEA] outline-none transition placeholder:text-[#526661] focus:border-[#6FD3C4]"
              />
            </div>
          )}

          {error && (
            <div className="rounded-[2px] border border-[#C95246]/45 bg-[#C95246]/12 px-3 py-2 text-xs text-[#F0A49B]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[2px] border border-[#6FD3C4] bg-[#6FD3C4]/18 py-2.5 text-xs font-medium tracking-[0.16em] text-[#EFFBF8] transition hover:bg-[#6FD3C4]/28 disabled:opacity-50"
          >
            {busy
              ? "正在核验通行证..."
              : mode === "register"
                ? "创建通行证并进入放映厅"
                : "登录并进入放映厅"}
          </button>
        </form>

        {/* Quick demo passes */}
        <div className="mt-5 border-t border-[#b4d4cc]/12 pt-4">
          <div className="font-reel text-[10px] tracking-[0.16em] text-[#6E857F]">
            快速体验预置通行证 · DEMO PASSES (密码 demo1234)
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("user-lin")}
              className="rounded-[2px] border border-[#b4d4cc]/18 bg-[#0B1518] px-3 py-2 text-left transition hover:border-[#6FD3C4]/45"
            >
              <div className="text-xs text-[#E8EFEA]">林深</div>
              <div className="font-reel text-[9px] text-[#728A84]">DEPT. REM-04</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("user-su")}
              className="rounded-[2px] border border-[#b4d4cc]/18 bg-[#0B1518] px-3 py-2 text-left transition hover:border-[#6FD3C4]/45"
            >
              <div className="text-xs text-[#E8EFEA]">苏晚</div>
              <div className="font-reel text-[9px] text-[#728A84]">DEPT. REM-09</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
