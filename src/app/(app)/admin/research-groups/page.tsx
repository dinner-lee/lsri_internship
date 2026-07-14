import { prisma } from "@/lib/prisma";
import { initialOf, formatDateTime, topicTitleOf } from "@/lib/utils";
import { ResearchControls, ResearchConfirmButton } from "./research-controls";

const RANK_WEIGHT = (rank: number) => 6 - rank;

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null)
    return (
      <span className="rounded-[4px] border border-dashed border-stone-300 px-1 py-px text-[9.5px] font-medium text-stone-400">
        미선호
      </span>
    );
  return (
    <span
      className={`rounded-[4px] px-1 py-px text-[9.5px] font-bold ${
        rank === 1 ? "bg-accent text-white" : "bg-accent-soft text-accent"
      }`}
    >
      {rank}순위
    </span>
  );
}

type SetWithGroups = {
  id: string;
  confirmedAt: Date | null;
  groups: {
    id: string;
    index: number;
    topic: { markdown: string; user: { name: string } };
    members: { id: string; rank: number | null; user: { name: string } }[];
  }[];
};

function GroupCards({ set }: { set: SetWithGroups }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
      {set.groups.map((g) => (
        <div
          key={g.id}
          className="flex flex-col gap-3 rounded-xl border border-line bg-white px-5 py-[18px]"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[13.5px]">
              <span className="font-bold text-accent">모둠 {g.index + 1}</span>
              <span className="text-stone-400"> · {g.members.length}명</span>
            </span>
            <span className="text-[13px] leading-snug font-semibold text-stone-800">
              {topicTitleOf(g.topic.markdown)}
            </span>
            <span className="text-[11px] text-stone-400">
              주제 작성: {g.topic.user.name.split("/")[0].trim()}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.members.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 rounded-full bg-paper py-1 pr-2.5 pl-1"
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-line text-[8.5px] font-semibold text-stone-600">
                  {initialOf(m.user.name)}
                </span>
                <span className="text-[11.5px] font-medium text-stone-700">
                  {m.user.name.split("/")[0].trim()}
                </span>
                <RankBadge rank={m.rank} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ResearchGroupsPage() {
  const include = {
    groups: {
      orderBy: { index: "asc" as const },
      include: {
        topic: { include: { user: true } },
        members: { orderBy: { rank: { sort: "asc" as const, nulls: "last" as const } }, include: { user: true } },
      },
    },
  };
  const [learners, picks, topics, currentSet, confirmedSets] = await Promise.all([
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.topicPick.findMany({ include: { user: true } }),
    prisma.topic.findMany({
      where: { markdown: { not: "" } },
      include: { user: true },
    }),
    prisma.researchGroupSet.findFirst({
      where: { confirmedAt: null },
      orderBy: { createdAt: "desc" },
      include,
    }),
    prisma.researchGroupSet.findMany({
      where: { confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include,
    }),
  ]);

  const pickedCount = new Set(picks.map((p) => p.userId)).size;

  // 주제별 득표 요약
  const voteRows = topics
    .map((t) => {
      const tp = picks.filter((p) => p.topicId === t.id);
      const score = tp.reduce((s, p) => s + RANK_WEIGHT(p.rank), 0);
      const byRank = [1, 2, 3, 4, 5].map((r) => tp.filter((p) => p.rank === r).length);
      return { t, score, byRank, voters: tp.length };
    })
    .sort((a, b) => b.score - a.score);
  const maxScore = Math.max(1, ...voteRows.map((r) => r.score));

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">자율연구 모둠 구성</div>
        <div className="text-[12.5px] text-stone-400">
          학습자들이 연구 주제 카드에 매긴 관심 순위(1~5)를 기준으로 모둠을 구성합니다
        </div>
      </div>

      {/* 주제별 득표 현황 */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-6">
        <span className="font-display text-[13.5px] text-stone-600">
          주제별 선호 현황{" "}
          <span className="font-normal text-stone-400">
            · 1순위 5점 ~ 5순위 1점 가중 합산 · 선호 제출 {pickedCount}명
          </span>
        </span>
        {voteRows.length === 0 && (
          <span className="text-[12.5px] text-stone-400">아직 작성된 연구 주제가 없습니다.</span>
        )}
        <div className="flex flex-col gap-2">
          {voteRows.map(({ t, score, byRank, voters }) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="w-[220px] flex-none truncate text-[12.5px] font-medium text-stone-800">
                {topicTitleOf(t.markdown)}
                <span className="ml-1.5 text-[10.5px] font-normal text-stone-400">
                  {t.user.name.split("/")[0].trim()}
                </span>
              </span>
              <span className="h-[7px] max-w-64 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.round((score / maxScore) * 100)}%` }}
                />
              </span>
              <span className="w-10 flex-none text-right text-[11.5px] font-bold text-accent">
                {score}점
              </span>
              <span className="hidden flex-none gap-1 text-[10px] text-stone-400 sm:flex">
                {voters === 0
                  ? "선호 없음"
                  : byRank
                      .map((n, i) => (n > 0 ? `${i + 1}순위 ${n}` : null))
                      .filter(Boolean)
                      .join(" · ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ResearchControls
        initialCount={currentSet?.groups.length ?? Math.max(2, Math.min(4, topics.length))}
        learnerCount={learners}
        pickedCount={pickedCount}
      />

      {currentSet && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-[13.5px] text-stone-600">
              구성 결과{" "}
              <span className="font-normal text-stone-400">
                · 아직 확정되지 않았습니다 — 다시 구성하면 대체됩니다
              </span>
            </span>
            <ResearchConfirmButton setId={currentSet.id} />
          </div>
          <GroupCards set={currentSet} />
        </div>
      )}

      {confirmedSets.length > 0 && (
        <details className="group rounded-[14px] border border-line bg-white" open={!currentSet}>
          <summary className="cursor-pointer list-none px-6 py-4">
            <span className="font-display text-[13.5px] text-stone-600">
              확정된 구성 기록{" "}
              <span className="font-normal text-stone-400">· {confirmedSets.length}건</span>
            </span>
          </summary>
          <div className="flex flex-col gap-5 border-t border-line-soft px-6 py-5">
            {confirmedSets.map((s) => (
              <div key={s.id} className="flex flex-col gap-2.5">
                <span className="text-[11.5px] text-stone-400">
                  {formatDateTime(s.confirmedAt!)} 확정 · 모둠 {s.groups.length}개
                </span>
                <GroupCards set={s} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
