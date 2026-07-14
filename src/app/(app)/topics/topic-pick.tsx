"use client";

import { useOptimistic, useTransition } from "react";
import { setTopicPickAction } from "@/lib/actions/research";

// 카드(링크) 내부에서 동작하는 관심 순위 선택 — 클릭이 카드 이동으로 번지지 않게 차단
export function TopicPickControl({ topicId, rank }: { topicId: string; rank: number | null }) {
  const [, startTransition] = useTransition();
  const [opt, setOpt] = useOptimistic(rank);

  const choose = (r: number | null) =>
    startTransition(async () => {
      setOpt(r);
      await setTopicPickAction(topicId, r);
    });

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span className="mr-0.5 text-[10.5px] font-medium text-stone-400">관심 순위</span>
      {[1, 2, 3, 4, 5].map((r) => (
        <button
          key={r}
          type="button"
          title={opt === r ? "선택 해제" : `${r}순위로 선택`}
          onClick={() => choose(opt === r ? null : r)}
          className={`flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
            opt === r
              ? "border-accent bg-accent text-white"
              : "border-line bg-white text-stone-400 hover:border-accent-border hover:text-accent"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
