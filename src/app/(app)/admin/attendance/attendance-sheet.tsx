"use client";

import { useOptimistic, useTransition } from "react";
import type { AttendanceStatus } from "@prisma/client";
import { setAttendanceAction, markAllPresentAction } from "@/lib/actions/attendance";
import { ATTENDANCE_STATUSES, ATTENDANCE_META } from "@/lib/attendance";
import { initialOf } from "@/lib/utils";

export interface AttendanceRow {
  userId: string;
  name: string;
  status: AttendanceStatus | null;
  totals: Record<AttendanceStatus, number>; // 오늘 이전 포함 누적
}

export function AttendanceSheet({ date, rows }: { date: string; rows: AttendanceRow[] }) {
  const [, startTransition] = useTransition();
  const [optRows, applyStatus] = useOptimistic(
    rows,
    (state, patch: { userId: string | "*"; status: AttendanceStatus | null }) =>
      state.map((r) =>
        patch.userId === "*"
          ? { ...r, status: r.status ?? patch.status }
          : r.userId === patch.userId
            ? { ...r, status: patch.status }
            : r
      )
  );

  const set = (userId: string, status: AttendanceStatus | null) =>
    startTransition(async () => {
      applyStatus({ userId, status });
      await setAttendanceAction(date, userId, status);
    });

  const allPresent = () =>
    startTransition(async () => {
      applyStatus({ userId: "*", status: "PRESENT" });
      await markAllPresentAction(date);
    });

  const checkedCount = optRows.filter((r) => r.status !== null).length;

  return (
    <div className="flex flex-col rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3">
        <span className="text-[12.5px] text-stone-500">
          체크 완료 <b className="text-accent">{checkedCount}</b> / {optRows.length}명
        </span>
        <button
          onClick={allPresent}
          className="cursor-pointer rounded-[8px] border border-line bg-white px-3.5 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-stone-300"
        >
          미체크 전원 출석
        </button>
      </div>
      {optRows.map((r) => (
        <div
          key={r.userId}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#f7f6f4] px-5 py-2.5 last:border-b-0"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-line text-[10.5px] font-semibold text-stone-600">
              {initialOf(r.name)}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium text-stone-800">{r.name}</span>
              <span className="text-[10px] text-stone-400">
                {ATTENDANCE_STATUSES.map(
                  (s) => `${ATTENDANCE_META[s].label} ${r.totals[s] ?? 0}`
                ).join(" · ")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {ATTENDANCE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => set(r.userId, r.status === s ? null : s)}
                title={r.status === s ? "체크 해제" : ATTENDANCE_META[s].label}
                className={`cursor-pointer rounded-[7px] border-[1.5px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                  r.status === s
                    ? ATTENDANCE_META[s].active
                    : "border-line bg-white text-stone-400 hover:border-stone-300"
                }`}
              >
                {ATTENDANCE_META[s].label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {optRows.length === 0 && (
        <div className="px-5 py-4 text-[13px] text-stone-400">등록된 학습자가 없습니다.</div>
      )}
    </div>
  );
}
