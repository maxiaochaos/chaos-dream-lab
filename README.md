# CHAOS DREAM LAB · 梦境胶片放映厅

记录醒来前的只言片语（文字或语音），在暗房微调分镜并显影成一段可以反复放映、导出视频并印制 35mm 纪念票根的梦境短片。

## 核心特性

- **Active Theory 风格 WebGL 液态暗室舞台**：基于 Three.js 原生 GLSL 三缓冲 Ping-Pong 二维波动方程，实现真实物理水波尾迹、RGB 色散光学折射与液态高光。
- **水下摄影级凝视之眼 + 悬浮 35mm 梦境光球**：水下真实摄影质感多眼随指针/聚焦梦境平滑追踪并异步眨眼；每个梦境以悬浮光球形式在暗室中流动。
- **捕梦室（文字 + 真实语音录音）**：支持浏览器 `MediaRecorder` 真实录音、实时声波可视化、Web Speech API 中文语音转写，原声通过 `IndexedDB` 本地持久化保存。
- **暗房显影台（《人生切割术》MDR 风格）**：4 格分镜接触印相条与 `BIN 01–04` 进度槽，支持修改任意镜头底片、运镜、中文字幕、Prompt 与单格重绘，支持实时切换 5 种 35mm 胶片调色。
- **沉浸胶片放映室 & 纪念票根**：60fps 动态放映引擎、Web Audio 氛围配乐、醒来原声回放、`.webm` 梦境视频导出、1240×580 高清 35mm 电影票根 PNG 冲印下载。
- **本地多用户通行证**：支持注册、登录、切换预置账号以及「公开放映 / 私密典藏」隔离。
- **可插拔真实 AI 接口**：零配置即可完整体验全流程；复制 `.env.example` 为 `.env.local` 并填入对应 Key 即可无缝接入真实 LLM、GPT-Image、Whisper ASR 与 Seedance / MiniMax 等视频生成 API。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可体验。

## 可选：接入真实 AI 模型

```bash
cp .env.example .env.local
```

在 `.env.local` 中按需填入 `OPENAI_API_KEY`、`IMAGE_API_KEY`、`ASR_API_KEY`、`SEEDANCE_API_KEY` 等环境变量，重启服务即可自动切换至真实云端模型。
