import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatTimeLimit } from "@/lib/quiz";
import { initialOf, dDayLabel } from "@/lib/utils";
import { DiscussionBoard } from "@/components/discussion-board";
import { QuizIcon, GroupIcon, HistoryIcon } from "@/components/icons";
import { RefreshOnFocus, RefreshButton } from "@/components/refresh";
import { InstantTabs } from "@/components/instant-tabs";

export default async function QuizHomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tab?: string }>;
}) {
  const { week, tab } = await searchParams;
  // 모둠 논의의 주차 이동(week 파라미터)도 모둠 탭에 머무르게 함
  const activeTab = tab === "group" || (tab === undefined && week !== undefined) ? "group" : "quiz";
  const user = await requireUser();

  // 왕복 지연을 줄이기 위해 병렬 실행
  const [current, mySubmissions, confirmedSet, liveSession] = await Promise.all([
    prisma.quiz.findFirst({
      where: { publishedAt: { not: null } },
      orderBy: { week: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.submission.findMany({
      where: { userId: user.id },
      include: { quiz: true },
      orderBy: { quiz: { week: "desc" } },
    }),
    // 확정된 최신 모둠
    prisma.groupSet.findFirst({
      where: { confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: {
        groups: {
          orderBy: { index: "asc" },
          include: { members: { include: { user: true } } },
        },
      },
    }),
    // 진행 중인 실시간 세션
    prisma.liveSession.findFirst({
      where: { status: { not: "ENDED" }, quiz: { publishedAt: { not: null } } },
      orderBy: { createdAt: "desc" },
      include: { quiz: true },
    }),
  ]);
  const currentSub = current ? mySubmissions.find((s) => s.quizId === current.id) : null;
  const records = mySubmissions.filter((s) => s.quizId !== current?.id);
  const myGroup = confirmedSet?.groups.find((g) =>
    g.members.some((m) => m.userId === user.id)
  );

  // 퀴즈 탭: 이번 주 퀴즈 + 지난 퀴즈 기록
  const quizContent = (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 font-display text-[16px] text-stone-600">
          <QuizIcon />
          이번 주 퀴즈
        </div>
        {current ? (
          <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-7 sm:py-3.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-[5px] bg-accent-soft px-2 py-[3px] text-[11px] font-semibold text-accent">
                  이번 주
                </span>
                <span className="text-[11.5px] text-stone-400">
                  {[
                    dDayLabel(current.dueAt),
                    `${current._count.questions}문항 · ${formatTimeLimit(current.timeLimitSec)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="font-display text-[19px] font-normal tracking-tight">
                {(() => {
                  const title = current.title || "(제목 없음)";
                  const m = title.match(/^(\d+주차\s*·?\s*)(.*)$/);
                  return m ? (
                    <>
                      <span className="text-accent">{m[1]}</span>
                      {m[2]}
                    </>
                  ) : (
                    title
                  );
                })()}
              </div>
            </div>
            <Link
              href={currentSub ? `/quiz/${current.id}/result` : `/quiz/${current.id}/take`}
              className="font-display w-full rounded-[10px] bg-accent py-3 text-center text-[14.5px] whitespace-nowrap text-white hover:bg-accent-strong sm:w-[132px]"
            >
              {currentSub ? "결과 보기" : "퀴즈 시작"}
            </Link>
          </div>
        ) : (
          <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
            아직 발행된 퀴즈가 없습니다.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 font-display text-[16px] text-stone-600">
          <HistoryIcon />
          지난 퀴즈 기록
        </div>
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
          {records.length === 0 && (
            <div className="px-5 py-4 text-[13px] text-stone-400">아직 기록이 없습니다.</div>
          )}
          {records.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between border-b border-line-soft px-5 py-[15px] last:border-b-0"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-10 text-xs text-stone-400">{rec.quiz.week}주차</span>
                <span className="text-[13.5px] font-medium text-stone-800">
                  {rec.quiz.title || "(제목 없음)"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-stone-400">
                  {rec.correctCount}/{rec.total} 정답
                </span>
                <span className="w-[38px] text-right text-sm font-bold text-accent">
                  {rec.score}점
                </span>
                <Link
                  href={`/quiz/${rec.quizId}/result`}
                  className="text-xs text-stone-500 hover:text-accent"
                >
                  해설 보기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // 모둠 탭: 이번 주 모둠 + 모둠별 논의
  const groupContent = (
    <>
      {myGroup && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 font-display text-[16px] text-stone-600">
            <GroupIcon />
            이번 주 모둠
          </div>
          <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-7 sm:py-3.5">
            <div className="flex flex-none flex-col gap-2">
              <div>
                <span className="rounded-[5px] bg-accent-soft px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-accent">
                  이번 주 모둠 배정
                </span>
              </div>
              <div className="font-display text-[19px] font-normal tracking-tight whitespace-nowrap">
                <span className="text-accent">모둠 {myGroup.index + 1}</span> ·{" "}
                {myGroup.members.length}명
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              {myGroup.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-[5px] pr-3 pl-1.5"
                >
                  <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-line text-[10px] font-semibold text-stone-600">
                    {initialOf(m.user.name)}
                  </div>
                  <span className="text-xs font-medium text-stone-700">
                    {m.userId === user.id ? `${m.user.name} (나)` : m.user.name}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href={`/group-memo/${myGroup.id}`}
              className="font-display w-full flex-none rounded-[10px] bg-accent py-3 text-center text-[14.5px] whitespace-nowrap text-white hover:bg-accent-strong sm:w-[132px]"
            >
              모둠 메모장
            </Link>
          </div>
        </div>
      )}

      {confirmedSet && (
        <DiscussionBoard weekParam={week} basePath="/quiz?tab=group" userId={user.id} />
      )}

      {!myGroup && !confirmedSet && (
        <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
          아직 확정된 모둠이 없습니다.
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <RefreshOnFocus />
      {liveSession && (
        <Link
          href={`/live/${liveSession.id}`}
          className="flex flex-col gap-3 rounded-[14px] border border-bad-border bg-bad-soft px-5 py-4 hover:opacity-90 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bad" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[14.5px] text-bad">실시간 퀴즈 진행 중</span>
              <span className="text-xs text-stone-500">
                {liveSession.quiz.week}주차 · {liveSession.quiz.title || "(제목 없음)"}
              </span>
            </div>
          </div>
          <span className="font-display rounded-[9px] bg-bad px-5 py-2 text-[13.5px] text-white">
            지금 참여하기 →
          </span>
        </Link>
      )}

      {/* 두 탭 내용을 미리 렌더링해 클라이언트에서 즉시 전환 */}
      <InstantTabs
        initial={activeTab}
        tabs={[
          {
            key: "quiz",
            label: (
              <>
                <QuizIcon size={14} />
                퀴즈
              </>
            ),
            content: quizContent,
          },
          {
            key: "group",
            label: (
              <>
                <GroupIcon size={14} />
                모둠
              </>
            ),
            right: confirmedSet ? <RefreshButton /> : undefined,
            content: groupContent,
          },
        ]}
      />
    </div>
  );
}
