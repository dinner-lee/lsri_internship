"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

// 주기 갱신 — 탭이 화면에 보일 때만 실행해 불필요한 서버 부하를 줄인다
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}

// 탭/창에 다시 돌아왔을 때 1회 갱신
export function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
  return null;
}

// 수동 새로고침 버튼
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="cursor-pointer rounded-[9px] border border-line bg-white px-4 py-2 text-[12.5px] font-semibold text-stone-600 hover:border-stone-300 disabled:opacity-60"
    >
      {pending ? "갱신 중…" : "↻ 새로고침"}
    </button>
  );
}
