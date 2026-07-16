"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function ExpandIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

interface MemoPayload {
  content: string;
  updatedByName: string | null;
  updatedAtLabel: string | null;
}

// 모둠 메모 전체 화면 뷰어 (관리자용) — 열려 있는 동안 최신 내용을 주기적으로 갱신
export function MemoFullscreenButton({
  title,
  subtitle,
  endpoint,
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
}) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState<MemoPayload | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as MemoPayload;
        if (alive) setMemo(data);
      } catch {
        // 일시적 네트워크 오류는 다음 주기에 재시도
      }
    };
    load();
    const timer = setInterval(load, 3000);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // 브라우저 전체 화면까지 요청 (지원하지 않으면 오버레이만 표시)
    rootRef.current?.requestFullscreen?.().catch(() => {});

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, endpoint, close]);

  // 사용자가 브라우저 UI(Esc 등)로 전체 화면을 빠져나가면 오버레이도 닫음
  useEffect(() => {
    if (!open) return;
    const onFsChange = () => {
      if (!document.fullscreenElement) setOpen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMemo(null);
          setOpen(true);
        }}
        title="전체 화면으로 보기"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[6px] text-stone-400 hover:bg-line-soft hover:text-stone-700"
      >
        <ExpandIcon />
      </button>

      {open && (
        <div ref={rootRef} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
          <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line-soft bg-white px-8 py-5 sm:px-14">
            <div className="flex flex-col gap-1">
              <span className="font-display text-[24px] font-bold tracking-tight">{title}</span>
              {subtitle && <span className="text-[14px] text-stone-500">{subtitle}</span>}
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-xl text-stone-400 hover:bg-line-soft hover:text-stone-700"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div className="mx-auto w-full max-w-4xl flex-1 px-8 py-10 sm:px-14">
            {memo === null ? (
              <div className="py-20 text-center text-[15px] text-stone-300">불러오는 중…</div>
            ) : memo.content ? (
              <div className="text-[19px] leading-[2] whitespace-pre-wrap [overflow-wrap:anywhere] text-stone-800">
                {memo.content}
              </div>
            ) : (
              <div className="py-20 text-center text-[15px] text-stone-300">
                아직 작성된 내용이 없습니다
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between border-t border-line-soft bg-paper px-8 py-2.5 text-[12px] text-stone-400 sm:px-14">
            <span>3초마다 자동 갱신</span>
            {memo?.updatedAtLabel && (
              <span>
                {memo.updatedByName ? `${memo.updatedByName} · ` : ""}
                {memo.updatedAtLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
