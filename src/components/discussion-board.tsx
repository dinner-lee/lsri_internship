import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { initialOf, formatDateTime, topicTitleOf } from "@/lib/utils";

function HeartIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  );
}

function CommentIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

// 주차별 전체 모둠 메모 모아보기 (관리자 '논의' + 학습자 '논의' 공용)
export async function DiscussionBoard({
  weekParam,
  basePath,
  userId,
}: {
  weekParam?: string;
  basePath: string;
  userId: string;
}) {
  const confirmedSets = await prisma.groupSet.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      quiz: true,
      groups: {
        orderBy: { index: "asc" },
        include: {
          members: { include: { user: true } },
          memo: { include: { updatedBy: { select: { name: true } } } },
          memoLikes: true,
          _count: { select: { memoComments: true } },
        },
      },
    },
  });

  if (confirmedSets.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 확정된 모둠이 없습니다.
      </div>
    );
  }

  // 주차별 최신 확정 구성만 선택지로 제공 (목록이 최신순이므로 첫 등장이 최신)
  const weekSets = [...new Map(confirmedSets.map((gs) => [gs.quiz.week, gs])).entries()].sort(
    (a, b) => b[0] - a[0]
  );
  const selected = weekSets.find(([w]) => String(w) === weekParam)?.[1] ?? weekSets[0][1];

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {weekSets.map(([w, gs]) => (
          <Link
            key={gs.id}
            href={`${basePath}${basePath.includes("?") ? "&" : "?"}week=${w}`}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
              gs.id === selected.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {w}주차
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {selected.groups.map((g) => {
          const isMine = g.members.some((m) => m.userId === userId);
          return (
            <div
              key={g.id}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white ${
                isMine ? "border-accent-border" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-[14px] font-normal">모둠 {g.index + 1}</span>
                  {isMine && (
                    <span className="rounded-[5px] bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      내 모둠
                    </span>
                  )}
                  <div className="flex -space-x-1.5">
                    {g.members.map((m) => (
                      <span
                        key={m.id}
                        title={m.user.name}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-line text-[9.5px] font-semibold text-stone-600"
                      >
                        {initialOf(m.user.name)}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/group-memo/${g.id}`}
                  className="text-xs text-stone-400 hover:text-accent"
                >
                  메모장 열기 →
                </Link>
              </div>

              <div className="max-h-72 min-h-32 flex-1 overflow-y-auto px-5 py-4">
                {g.memo?.content ? (
                  <div className="text-[13px] leading-[1.8] whitespace-pre-wrap [overflow-wrap:anywhere] text-stone-800">
                    {g.memo.content}
                  </div>
                ) : (
                  <div className="py-6 text-center text-[12.5px] text-stone-300">
                    아직 작성된 내용이 없습니다
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-line-soft bg-paper px-5 py-1.5 text-[11px] text-stone-400">
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <span className="text-bad">
                      <HeartIcon />
                    </span>
                    {g.memoLikes.length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CommentIcon />
                    {g._count.memoComments}
                  </span>
                </span>
                {g.memo && (
                  <span>
                    {g.memo.updatedBy ? `${g.memo.updatedBy.name} · ` : ""}
                    {formatDateTime(g.memo.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// 자율연구 모둠 메모 모아보기 (최신 확정 구성 기준)
export async function ResearchDiscussionBoard({ userId }: { userId: string }) {
  const set = await prisma.researchGroupSet.findFirst({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      groups: {
        orderBy: { index: "asc" },
        include: {
          topic: true,
          members: { include: { user: true } },
          memo: { include: { updatedBy: { select: { name: true } } } },
          memoLikes: true,
          _count: { select: { memoComments: true } },
        },
      },
    },
  });

  if (!set) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 확정된 자율연구 모둠이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {set.groups.map((g) => {
        const isMine = g.members.some((m) => m.userId === userId);
        return (
          <div
            key={g.id}
            className={`flex flex-col overflow-hidden rounded-xl border bg-white ${
              isMine ? "border-accent-border" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[14px] font-normal">모둠 {g.index + 1}</span>
                {isMine && (
                  <span className="rounded-[5px] bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    내 모둠
                  </span>
                )}
                <div className="flex -space-x-1.5">
                  {g.members.map((m) => (
                    <span
                      key={m.id}
                      title={m.user.name}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-line text-[9.5px] font-semibold text-stone-600"
                    >
                      {initialOf(m.user.name)}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/research-memo/${g.id}`}
                className="whitespace-nowrap text-xs text-stone-400 hover:text-accent"
              >
                메모장 열기 →
              </Link>
            </div>
            <div className="truncate border-b border-line-soft px-5 py-2 text-[11.5px] text-stone-500">
              주제: <b className="text-stone-700">{topicTitleOf(g.topic.markdown)}</b>
            </div>

            <div className="max-h-72 min-h-32 flex-1 overflow-y-auto px-5 py-4">
              {g.memo?.content ? (
                <div className="text-[13px] leading-[1.8] whitespace-pre-wrap [overflow-wrap:anywhere] text-stone-800">
                  {g.memo.content}
                </div>
              ) : (
                <div className="py-6 text-center text-[12.5px] text-stone-300">
                  아직 작성된 내용이 없습니다
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line-soft bg-paper px-5 py-1.5 text-[11px] text-stone-400">
              <span className="flex items-center gap-2 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <span className="text-bad">
                    <HeartIcon />
                  </span>
                  {g.memoLikes.length}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CommentIcon />
                  {g._count.memoComments}
                </span>
              </span>
              {g.memo && (
                <span>
                  {g.memo.updatedBy ? `${g.memo.updatedBy.name} · ` : ""}
                  {formatDateTime(g.memo.updatedAt)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
