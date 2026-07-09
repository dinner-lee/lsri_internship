"use client";

import type { RankEntry } from "@/lib/live";
import { initialOf } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

// 순위와 이름만 표시 (점수 숫자 비노출)
export function RankingList({
  ranking,
  limit,
  title = "현재 랭킹",
}: {
  ranking: RankEntry[];
  limit?: number;
  title?: string;
}) {
  const myIdx = ranking.findIndex((r) => r.isMe);
  const shown = limit ? ranking.slice(0, limit) : ranking;
  const showMyRow = limit !== undefined && myIdx >= limit;

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-6">
      <div className="font-display text-[14px] text-stone-600">{title}</div>
      <div className="flex flex-col">
        {shown.map((r, i) => (
          <RankRow key={i} rank={i + 1} entry={r} />
        ))}
        {showMyRow && (
          <>
            <div className="py-1 text-center text-[11px] text-stone-300">⋯</div>
            <RankRow rank={myIdx + 1} entry={ranking[myIdx]} />
          </>
        )}
        {ranking.length === 0 && (
          <div className="py-2 text-[12.5px] text-stone-400">아직 참가자가 없습니다</div>
        )}
      </div>
    </div>
  );
}

function RankRow({ rank, entry }: { rank: number; entry: RankEntry }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        entry.isMe ? "bg-accent-soft" : ""
      }`}
    >
      <span className="w-7 text-center text-[14px] font-bold tabular-nums">
        {MEDALS[rank - 1] ?? <span className="text-stone-400">{rank}</span>}
      </span>
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-line text-[10.5px] font-semibold text-stone-600">
        {initialOf(entry.name)}
      </span>
      <span
        className={`text-[13.5px] ${
          entry.isMe ? "font-bold text-accent" : "font-medium text-stone-800"
        }`}
      >
        {entry.name}
        {entry.isMe && " (나)"}
      </span>
    </div>
  );
}
