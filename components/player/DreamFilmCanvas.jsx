"use client";

import { useEffect, useRef } from "react";
import {
  getDreamDuration,
  renderSequenceFrame,
  renderShotFrame,
} from "../../lib/cinema/renderer";

export function ShotStillCanvas({
  shot,
  filmStock = "lumon-35mm",
  width = 480,
  height = 270,
  showSubtitle = false,
  letterbox = false,
  className = "h-full w-full object-cover",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    if (shot.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        renderShotFrame(ctx, width, height, shot, filmStock, 0.35, {
          loadedImage: img,
          showSubtitle,
          letterbox,
          cameraZoom: false,
        });
      };
      img.onerror = () => {
        if (cancelled) return;
        renderShotFrame(ctx, width, height, shot, filmStock, 0.35, {
          showSubtitle,
          letterbox,
          cameraZoom: false,
        });
      };
      img.src = shot.imageUrl;
    } else {
      renderShotFrame(ctx, width, height, shot, filmStock, 0.35, {
        showSubtitle,
        letterbox,
        cameraZoom: false,
      });
    }

    return () => {
      cancelled = true;
    };
  }, [shot, filmStock, width, height, showSubtitle, letterbox]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}

export function DreamAmbientCanvas({
  dream,
  width = 1120,
  height = 540,
  showSubtitles = true,
  className = "h-full w-full object-cover",
}) {
  const canvasRef = useRef(null);
  const imagesRef = useRef({});

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dream) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const total = getDreamDuration(dream);
    let rafId = 0;
    let startTs = 0;

    const loop = (ts) => {
      if (!startTs) startTs = ts;
      const elapsed = ((ts - startTs) / 1000) % total;
      renderSequenceFrame(ctx, width, height, dream, elapsed, imagesRef.current, {
        showSubtitles,
        showTitleCard: false,
      });
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [dream, width, height, showSubtitles]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
