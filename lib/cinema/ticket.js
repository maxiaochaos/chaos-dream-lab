import { getFilmStock } from "./presets";
import { renderShotFrame } from "./renderer";

function wrapChineseText(ctx, text, maxWidth, maxLines = 3) {
  const chars = Array.from(String(text || ""));
  const lines = [];
  let line = "";
  for (let i = 0; i < chars.length; i += 1) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = chars[i];
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  return lines;
}

export function generateDreamTicketDataUrl(dream, loadedImage = null) {
  if (typeof document === "undefined" || !dream) return "";
  const w = 1240;
  const h = 580;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const stock = getFilmStock(dream.filmStock);

  // Deep Severance MDR navy-teal matte
  ctx.fillStyle = "#061117";
  ctx.fillRect(0, 0, w, h);

  // Ticket card body
  const pad = 28;
  const cardX = pad;
  const cardY = pad;
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;

  ctx.fillStyle = "#0B1B24";
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Precision double hairline border (Severance corporate archive aesthetic)
  ctx.strokeStyle = "rgba(125, 216, 232, 0.44)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1);
  ctx.strokeStyle = "rgba(232, 239, 234, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cardX + 7.5, cardY + 7.5, cardW - 15, cardH - 15);

  // Left film frame section
  const splitX = 760;
  const frameX = cardX + 26;
  const frameY = cardY + 54;
  const frameW = splitX - frameX - 28;
  const frameH = cardH - 108;

  // Sprocket holes top and bottom of left panel
  ctx.fillStyle = "rgba(111, 211, 196, 0.22)";
  for (let sx = frameX; sx < frameX + frameW - 14; sx += 34) {
    ctx.fillRect(sx, cardY + 20, 18, 10);
    ctx.fillRect(sx, cardY + cardH - 30, 18, 10);
  }

  // Render hero still into left frame
  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX, frameY, frameW, frameH);
  ctx.clip();
  ctx.translate(frameX, frameY);
  renderShotFrame(ctx, frameW, frameH, dream.shots?.[0], dream.filmStock, 0.42, {
    loadedImage,
    showSubtitle: false,
    letterbox: true,
    cameraZoom: false,
  });
  ctx.restore();

  ctx.strokeStyle = "rgba(111, 211, 196, 0.28)";
  ctx.strokeRect(frameX, frameY, frameW, frameH);

  // Perforated vertical tear line & semicircular notches
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(111, 211, 196, 0.36)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(splitX, cardY + 24);
  ctx.lineTo(splitX, cardY + cardH - 24);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#070E10";
  ctx.beginPath();
  ctx.arc(splitX, cardY, 18, 0, Math.PI * 2);
  ctx.arc(splitX, cardY + cardH, 18, 0, Math.PI * 2);
  ctx.fill();

  // Right ticket stub typography (Lumon Archive Pass)
  const stubX = splitX + 34;
  const stubW = cardX + cardW - stubX - 30;

  ctx.fillStyle = "#6FD3C4";
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillText("CHAOS DREAM LAB  //  REM SCREENING PASS", stubX, cardY + 54);

  ctx.fillStyle = "#8FA39D";
  ctx.font = '400 11px "IBM Plex Mono", monospace';
  ctx.fillText(
    `${dream.reelCode || "REEL #001"}   ·   ${stock.code}   ·   WAKING↔REM`,
    stubX,
    cardY + 78,
  );

  // Divider
  ctx.fillStyle = "rgba(180, 212, 204, 0.16)";
  ctx.fillRect(stubX, cardY + 96, stubW, 1);

  // Dream title
  ctx.fillStyle = "#E8EFEA";
  ctx.font = '600 30px "Noto Serif SC", "Songti SC", Georgia, serif';
  const titleLines = wrapChineseText(ctx, dream.title || "无题之梦", stubW, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, stubX, cardY + 146 + idx * 42);
  });

  // Excerpt / favorite subtitle
  const quote = dream.shots?.[0]?.subtitle || dream.summary || dream.rawText || "";
  ctx.fillStyle = "#B7C7C2";
  ctx.font = '400 15px "Noto Serif SC", Georgia, serif';
  const quoteLines = wrapChineseText(ctx, `“${quote}”`, stubW, 3);
  const quoteStartY = cardY + 166 + titleLines.length * 42;
  quoteLines.forEach((line, idx) => {
    ctx.fillText(line, stubX, quoteStartY + idx * 26);
  });

  // Metadata grid near bottom
  const metaY = cardY + cardH - 146;
  ctx.fillStyle = "rgba(180, 212, 204, 0.16)";
  ctx.fillRect(stubX, metaY - 22, stubW, 1);

  const metaItems = [
    ["RECORDED", dream.dreamDate || "—"],
    ["RESONANCE", dream.mood || "怀旧"],
    ["SUBJECT", dream.authorName || "匿名造梦者"],
    ["STOCK", stock.enName],
  ];

  metaItems.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = stubX + col * (stubW / 2);
    const my = metaY + row * 44;
    ctx.fillStyle = "#6B827C";
    ctx.font = '400 10px "IBM Plex Mono", monospace';
    ctx.fillText(k, mx, my);
    ctx.fillStyle = "#E8EFEA";
    ctx.font = '500 14px "Noto Sans SC", sans-serif';
    ctx.fillText(String(v).slice(0, 18), mx, my + 20);
  });

  // Decorative archive barcode at bottom of stub
  const barY = cardY + cardH - 48;
  ctx.fillStyle = "rgba(111, 211, 196, 0.48)";
  let bx = stubX;
  const codeSeed = (dream.id || "dream") + (dream.reelCode || "");
  for (let i = 0; i < 42 && bx < stubX + stubW - 6; i += 1) {
    const bw = ((codeSeed.charCodeAt(i % codeSeed.length) + i * 7) % 4) + 1;
    ctx.fillRect(bx, barY, bw, 20);
    bx += bw + 3;
  }

  return canvas.toDataURL("image/png");
}
