import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPrevGroupOf } from "@/lib/actions/groups";
import { overlapPairs, METHOD_LABELS, type GroupMethodKey } from "@/lib/groups";
import { initialOf, formatDateTime } from "@/lib/utils";
import { GroupControls, ConfirmButtons } from "./group-controls";

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const quizzes = await prisma.quiz.findMany({
    orderBy: { week: "asc" },
    include: { _count: { select: { submissions: true } } },
  });
  if (quizzes.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 만든 퀴즈가 없습니다.{" "}
        <Link href="/admin/quizzes/new" className="text-accent underline">
          첫 퀴즈 만들기
        </Link>
      </div>
    );
  }
  const selected =
    quizzes.find((q) => String(q.week) === week) ?? quizzes[quizzes.length - 1];

  const [groupSet, submissions, prevGroupOf, confirmedHistory] = await Promise.all([
    prisma.groupSet.findFirst({
      where: { quizId: selected.id },
      orderBy: [{ confirmedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      include: {
        groups: {
          orderBy: { index: "asc" },
          include: { members: { include: { user: true } } },
        },
      },
    }),
    prisma.submission.findMany({ where: { quizId: selected.id } }),
    getPrevGroupOf(selected.id),
    // 확정된 모둠 기록 (최신순)
    prisma.groupSet.findMany({
      where: { confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: {
        quiz: true,
        groups: {
          orderBy: { index: "asc" },
          include: { members: { include: { user: true } } },
        },
      },
    }),
  ]);
  const scoreOf = new Map(submissions.map((s) => [s.userId, s.score]));

  const groupCards = (groupSet?.groups ?? []).map((g) => {
    const scores = g.members.map((m) => scoreOf.get(m.userId) ?? 0);
    const avg = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "–";
    const overlap = overlapPairs(g.members, prevGroupOf);
    return { g, avg, overlap };
  });
  const avgs = groupCards.map((c) => parseFloat(c.avg)).filter((n) => !isNaN(n));

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">모둠 자동 구성</div>
        <div className="text-[12.5px] text-stone-400">
          선택한 주차의 퀴즈 점수를 기준으로 모둠을 구성합니다 (점수는 관리자에게만 표시됩니다)
        </div>
      </div>

      <GroupControls
        quizId={selected.id}
        week={selected.week}
        weeks={quizzes.map((q) => ({
          week: q.week,
          submissionCount: q._count.submissions,
        }))}
        submissionCount={selected._count.submissions}
        initialSize={groupSet?.size ?? 4}
        initialMethod={
          (groupSet?.method === "SIMILAR" ? "SIMILAR" : "BALANCED") as GroupMethodKey
        }
        initialAvoidPrev={groupSet?.avoidPrev ?? false}
      />

      {groupSet && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[13.5px] text-stone-600">
              구성 결과{" "}
              <span className="font-normal text-stone-400">
                · {METHOD_LABELS[groupSet.method]?.label}
                {groupSet.avoidPrev && " · 이전 모둠 회피"} · 모둠 평균{" "}
                {avgs.length ? `${Math.min(...avgs).toFixed(1)}–${Math.max(...avgs).toFixed(1)}점` : "–"}
              </span>
            </span>
            <ConfirmButtons groupSetId={groupSet.id} confirmed={!!groupSet.confirmedAt} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {groupCards.map(({ g, avg, overlap }) => (
              <div
                key={g.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-white px-5 py-[18px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[13.5px] font-bold">모둠 {g.index + 1}</span>
                  <span className="flex items-center gap-2.5 text-[11.5px] text-stone-400">
                    평균 <b className="text-accent">{avg}점</b>
                    {groupSet.confirmedAt && (
                      <Link
                        href={`/group-memo/${g.id}`}
                        className="text-stone-400 hover:text-accent"
                      >
                        메모장 →
                      </Link>
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-[7px]">
                  {g.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-line text-[10px] font-semibold text-stone-600">
                        {initialOf(m.user.name)}
                      </div>
                      <span className="text-[12.5px] text-stone-800">{m.user.name}</span>
                    </div>
                  ))}
                </div>
                {groupSet.avoidPrev && (
                  <div
                    className={`border-t border-line-soft pt-2 text-[11px] ${
                      overlap === 0 ? "text-good" : "text-warn"
                    }`}
                  >
                    {overlap === 0 ? "✓ 이전 모둠과 겹침 없음" : `△ 이전 모둠 겹침 ${overlap}쌍`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmedHistory.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <span className="font-display text-[13.5px] text-stone-600">
            확정된 모둠 기록{" "}
            <span className="font-normal text-stone-400">
              — 가장 최근 확정이 학습자에게 표시됩니다
            </span>
          </span>
          <div className="flex flex-col gap-2">
            {confirmedHistory.map((h, hi) => (
              <details
                key={h.id}
                className="group rounded-xl border border-line bg-white open:pb-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone-300 transition-transform group-open:rotate-90">
                      ▶
                    </span>
                    <span className="text-[13px] font-semibold text-stone-800">
                      {h.quiz.week}주차 기준 · 모둠 {h.groups.length}개
                    </span>
                    <span className="text-xs text-stone-400">
                      {METHOD_LABELS[h.method]?.label}
                      {h.avoidPrev && " · 이전 모둠 회피"} · {h.size}명씩
                    </span>
                    {hi === 0 && (
                      <span className="rounded-[5px] bg-accent-soft px-2 py-[3px] text-[10.5px] font-semibold text-accent">
                        학습자 공개 중
                      </span>
                    )}
                  </div>
                  <span className="text-[11.5px] text-stone-400">
                    {formatDateTime(h.confirmedAt!)} 확정
                  </span>
                </summary>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 px-5">
                  {h.groups.map((g) => (
                    <div key={g.id} className="rounded-lg bg-paper px-3.5 py-2.5">
                      <div className="mb-1.5 text-xs font-bold text-stone-700">
                        모둠 {g.index + 1}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {g.members.map((m) => (
                          <span
                            key={m.id}
                            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600"
                          >
                            {m.user.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
