"use client";

import { useOptimistic, useTransition } from "react";
import { toggleKeywordLikeAction } from "@/lib/actions/topics";

interface Item {
  keyword: string;
  count: number;
  liked: boolean;
}

export function KeywordCloud({ items }: { items: Item[] }) {
  const [, startTransition] = useTransition();
  // 낙관적 갱신: 클릭 즉시 하트/카운트 반영, 서버 응답 도착 시 실제 값으로 정착
  const [optItems, applyToggle] = useOptimistic(items, (state, keyword: string) =>
    state.map((it) =>
      it.keyword === keyword
        ? { ...it, liked: !it.liked, count: it.count + (it.liked ? -1 : 1) }
        : it
    )
  );

  if (optItems.length === 0)
    return <div className="text-xs text-stone-400">아직 등록된 키워드가 없습니다.</div>;

  return (
    <div className="flex flex-wrap gap-[7px]">
      {optItems.map((it) => (
        <button
          key={it.keyword}
          onClick={() =>
            startTransition(async () => {
              applyToggle(it.keyword);
              await toggleKeywordLikeAction(it.keyword);
            })
          }
          className={`flex cursor-pointer items-center gap-[7px] rounded-full border px-[13px] py-1.5 hover:border-accent-border ${
            it.liked ? "border-bad-border bg-bad-soft" : "border-line bg-white"
          }`}
        >
          <span className="text-[12.5px] font-medium text-stone-700">#{it.keyword}</span>
          <span className={`text-[11.5px] ${it.liked ? "text-bad" : "text-stone-300"}`}>
            {it.liked ? "♥" : "♡"} {it.count}
          </span>
        </button>
      ))}
    </div>
  );
}
