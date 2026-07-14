"use client";

import { useState, useTransition } from "react";
import {
  generateResearchGroupsAction,
  confirmResearchGroupsAction,
} from "@/lib/actions/research";

export function ResearchControls({
  initialCount,
  learnerCount,
  pickedCount,
}: {
  initialCount: number;
  learnerCount: number;
  pickedCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const generate = () => startTransition(() => generateResearchGroupsAction(count));
  const per = learnerCount > 0 ? Math.floor(learnerCount / count) : 0;
  const rem = learnerCount > 0 ? learnerCount % count : 0;

  return (
    <div className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-6">
      <div className="flex flex-wrap items-end gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-stone-600">모둠 수</span>
          <div className="flex items-center gap-0.5 rounded-[9px] bg-line-soft p-[3px]">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="h-[30px] w-[30px] cursor-pointer rounded-[7px] text-base text-stone-600 hover:bg-white"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold">{count}</span>
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(20, c + 1))}
              className="h-[30px] w-[30px] cursor-pointer rounded-[7px] text-base text-stone-600 hover:bg-white"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 pb-1 text-[12px] text-stone-400">
          <span>
            학습자 {learnerCount}명 → 모둠당 {per}
            {rem > 0 ? `–${per + 1}` : ""}명 · 선호 제출 {pickedCount}명
          </span>
          <span>
            작성자는 자기 주제에 우선 배정되고, 나머지는 대체로 1~2순위 안에 들도록 배정합니다
          </span>
        </div>
        <button
          onClick={generate}
          disabled={pending || learnerCount === 0}
          className="font-display ml-auto cursor-pointer rounded-[9px] bg-accent px-6 py-2.5 text-[14px] text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "구성 중…" : "모둠 구성"}
        </button>
      </div>
    </div>
  );
}

export function ResearchConfirmButton({ setId }: { setId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          if (confirm("이 구성을 확정할까요? 확정하면 학습자에게 공개됩니다.")) {
            await confirmResearchGroupsAction(setId);
          }
        })
      }
      disabled={pending}
      className="font-display cursor-pointer rounded-[9px] bg-accent px-5 py-2 text-[13px] text-white hover:bg-accent-strong disabled:opacity-60"
    >
      {pending ? "확정 중…" : "이 구성으로 확정"}
    </button>
  );
}
