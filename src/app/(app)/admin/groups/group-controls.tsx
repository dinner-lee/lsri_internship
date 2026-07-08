"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { generateGroupsAction, confirmGroupsAction } from "@/lib/actions/groups";
import { METHOD_LABELS, type GroupMethodKey } from "@/lib/groups";

const METHOD_KEYS: GroupMethodKey[] = ["BALANCED", "SIMILAR", "AVOID_PREV"];

export function GroupControls({
  quizId,
  week,
  weeks,
  submissionCount,
  initialSize,
  initialMethod,
}: {
  quizId: string;
  week: number;
  weeks: { week: number; submissionCount: number }[];
  submissionCount: number;
  initialSize: number;
  initialMethod: GroupMethodKey;
}) {
  const [size, setSize] = useState(initialSize);
  const [method, setMethod] = useState<GroupMethodKey>(initialMethod);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const res = await generateGroupsAction(quizId, size, method);
      if (res.error) setError(res.error);
    });

  const groupCount = Math.max(1, Math.ceil(submissionCount / size));
  const remainder = submissionCount % size;

  return (
    <div className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-6">
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-stone-600">기준 주차</span>
          <div className="flex flex-wrap gap-1.5">
            {weeks.map((w) => (
              <Link
                key={w.week}
                href={`/admin/groups?week=${w.week}`}
                className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
                  w.week === week
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                {w.week}주차
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-stone-600">모둠별 인원</span>
          <div className="flex items-center gap-0.5 rounded-[9px] bg-line-soft p-[3px]">
            <button
              type="button"
              onClick={() => setSize((s) => Math.max(2, s - 1))}
              className="h-[30px] w-[30px] cursor-pointer rounded-[7px] text-base text-stone-600 hover:bg-white"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold">{size}</span>
            <button
              type="button"
              onClick={() => setSize((s) => Math.min(10, s + 1))}
              className="h-[30px] w-[30px] cursor-pointer rounded-[7px] text-base text-stone-600 hover:bg-white"
            >
              ＋
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-stone-600">구성 방법</span>
          <div className="flex flex-wrap gap-1.5">
            {METHOD_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMethod(k)}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-[10px] border-[1.5px] px-4 py-2.5 text-left ${
                  method === k ? "border-accent bg-accent-soft" : "border-line bg-white"
                }`}
              >
                <span
                  className={`text-[12.5px] font-semibold ${
                    method === k ? "text-accent" : "text-stone-700"
                  }`}
                >
                  {METHOD_LABELS[k].label}
                </span>
                <span className="text-[10.5px] text-stone-400">{METHOD_LABELS[k].sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line-soft pt-4">
        <span className="text-[12.5px] text-stone-500">
          제출자 {submissionCount}명 → 모둠 {groupCount}개
          {remainder ? ` (마지막 모둠 ${remainder}명)` : ""}
          {error && <span className="ml-3 font-medium text-bad">{error}</span>}
        </span>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="font-display cursor-pointer rounded-[9px] bg-accent px-6 py-[11px] text-[13.5px] text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "구성 중…" : "모둠 구성 실행"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmButtons({
  groupSetId,
  confirmed,
}: {
  groupSetId: string;
  confirmed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  if (confirmed)
    return (
      <span className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white">
        ✓ 확정됨 · 학습자에게 공개
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => startTransition(() => confirmGroupsAction(groupSetId))}
      disabled={pending}
      className="font-display cursor-pointer rounded-lg bg-stone-900 px-4 py-2 text-[12.5px] text-white disabled:opacity-60"
    >
      이 구성으로 확정
    </button>
  );
}
