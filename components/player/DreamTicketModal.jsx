"use client";

import { useEffect, useState } from "react";
import { generateDreamTicketDataUrl } from "../../lib/cinema/ticket";
import { CloseIcon, DownloadIcon } from "../icons/CinemaIcons";

export default function DreamTicketModal({ dream, onClose }) {
  const [ticketUrl, setTicketUrl] = useState("");

  useEffect(() => {
    if (!dream) return;
    let cancelled = false;
    const firstImgUrl = dream.shots?.[0]?.imageUrl;
    if (firstImgUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) setTicketUrl(generateDreamTicketDataUrl(dream, img));
      };
      img.onerror = () => {
        if (!cancelled) setTicketUrl(generateDreamTicketDataUrl(dream, null));
      };
      img.src = firstImgUrl;
    } else {
      setTicketUrl(generateDreamTicketDataUrl(dream, null));
    }
    return () => {
      cancelled = true;
    };
  }, [dream]);

  const handleDownload = () => {
    if (!ticketUrl) return;
    const a = document.createElement("a");
    a.href = ticketUrl;
    a.download = `chaos-dream-ticket-${dream.reelCode?.replace(/[^0-9a-z]/gi, "") || "pass"}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#030A0E]/85 p-4 backdrop-blur-md">
      <div className="lumon-panel relative w-full max-w-4xl rounded-[2px] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-reel text-[10px] tracking-[0.2em] text-[#7DD8E8]">
              CHAOS DREAM LAB · 35MM REM SCREENING PASS
            </div>
            <h3 className="mt-1 font-cinema text-xl text-[#EAF4F4]">
              梦境纪念电影票根 · {dream.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭票根预览"
            className="rounded-[2px] p-1.5 text-[#7F9DA6] transition hover:bg-[#132833] hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[2px] border border-[#9adae8]/20 bg-[#061015] p-2">
          {ticketUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticketUrl}
              alt={`${dream.title} 梦境纪念票根`}
              className="h-auto w-full rounded-[1px]"
            />
          ) : (
            <div className="grid aspect-[124/58] place-items-center font-reel text-xs text-[#7DD8E8]">
              正在冲印 35MM 纪念票根...
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#89A5AE]">
            高清 PNG（1240×580），可保存到相册珍藏，或发给出现在梦里的那个人。
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!ticketUrl}
            className="flex items-center gap-2 rounded-[2px] border border-[#DAA75A] bg-[#DAA75A]/18 px-5 py-2.5 text-xs font-medium tracking-[0.14em] text-[#F9E7C5] transition hover:bg-[#DAA75A]/28 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            下载高清票根 PNG
          </button>
        </div>
      </div>
    </div>
  );
}
