"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveStatePayload } from "@/lib/live";

// 실시간 세션 상태 폴링 훅
export function useLiveState(sessionId: string, intervalMs = 1500) {
  const [state, setState] = useState<LiveStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${sessionId}/state`, { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 404 ? "세션을 찾을 수 없습니다" : null);
        return;
      }
      setState(await res.json());
      setError(null);
    } catch {
      // 네트워크 일시 오류는 다음 폴링에서 회복
    }
  }, [sessionId]);

  useEffect(() => {
    // 외부(서버) 상태 구독: 즉시 1회 + 주기 폴링
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  return { state, error, refresh };
}
