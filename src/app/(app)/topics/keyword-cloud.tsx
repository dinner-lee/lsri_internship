"use client";

import { useTransition } from "react";
import { toggleKeywordLikeAction } from "@/lib/actions/topics";

export function KeywordCloud({
  items,
}: {
  items: { keyword: string; count: number; liked: boolean }[];
}) {
  const [, startTransition] = useTransition();

  if (items.length === 0)
    return <div className="text-xs text-stone-400">아직 등록된 키워드가 없습니다.</div>;

  return (
    <div className="flex flex-wrap gap-[7px]">
      {items.map((it) => (
        <button
          key={it.keyword}
          onClick={() => startTransition(() => toggleKeywordLikeAction(it.keyword))}
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
