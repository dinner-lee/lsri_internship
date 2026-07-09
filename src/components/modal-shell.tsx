"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 인터셉팅 라우트용 모달 컨테이너 (배경 클릭·ESC·✕로 닫기)
export function ModalShell({
  closeHref,
  children,
}: {
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-stone-950/40 backdrop-blur-[2px]"
      onClick={() => router.push(closeHref)}
    >
      <div className="flex min-h-full items-start justify-center p-4 md:p-10">
        <div
          className="relative w-full max-w-3xl rounded-2xl bg-paper p-6 shadow-[0_12px_48px_rgba(0,0,0,0.22)] md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => router.push(closeHref)}
            aria-label="닫기"
            className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[15px] text-stone-400 hover:bg-line-soft hover:text-stone-700"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
