"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 수업 중 모니터링용: 주기적으로 서버 데이터 갱신
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
