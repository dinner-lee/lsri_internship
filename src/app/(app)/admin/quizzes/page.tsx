import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminQuizzesPage() {
  const [quizzes, liveSession] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: { week: "desc" },
      include: { _count: { select: { questions: true, submissions: true } } },
    }),
    // 진행 중인 실시간 세션 (진행 화면 재진입 경로)
    prisma.liveSession.findFirst({
      where: { status: { not: "ENDED" } },
      orderBy: { createdAt: "desc" },
      include: { quiz: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[17px] font-bold tracking-tight">퀴즈 작성</div>
          <div className="text-[12.5px] text-stone-400">
            주차별 퀴즈를 만들고 학습자에게 발행합니다 · 실시간 진행은 각 퀴즈 화면에서 시작합니다
          </div>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="font-display rounded-[9px] bg-accent px-5 py-2.5 text-[13.5px] text-white hover:bg-accent-strong"
        >
          + 새 퀴즈
        </Link>
      </div>

      {liveSession && (
        <Link
          href={`/admin/live/${liveSession.id}`}
          className="flex items-center justify-between rounded-[14px] border border-bad-border bg-bad-soft px-5 py-3.5 hover:opacity-90 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bad" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[14px] text-bad">실시간 퀴즈 진행 중</span>
              <span className="text-xs text-stone-500">
                {liveSession.quiz.week}주차 · {liveSession.quiz.title || "(제목 없음)"}
              </span>
            </div>
          </div>
          <span className="font-display rounded-[9px] bg-bad px-4 py-2 text-[13px] text-white">
            진행 화면 열기 →
          </span>
        </Link>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
        {quizzes.length === 0 && (
          <div className="px-5 py-4 text-[13px] text-stone-400">
            아직 만든 퀴즈가 없습니다. 첫 퀴즈를 만들어보세요.
          </div>
        )}
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="flex items-center border-b border-line-soft last:border-b-0 hover:bg-paper"
          >
            <Link
              href={`/admin/quizzes/${q.id}`}
              className="flex flex-1 items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-12 text-xs text-stone-400">{q.week}주차</span>
                <span className="text-[13.5px] font-medium text-stone-800">
                  {q.title || "(제목 없음)"}
                </span>
                <span
                  className={`rounded-[5px] px-2 py-[3px] text-[11px] font-semibold ${
                    q.publishedAt
                      ? "bg-accent-soft text-accent"
                      : "bg-line-soft text-stone-400"
                  }`}
                >
                  {q.publishedAt ? "발행됨" : "임시저장"}
                </span>
                {liveSession?.quizId === q.id && (
                  <span className="rounded-[5px] bg-bad-soft px-2 py-[3px] text-[11px] font-bold text-bad">
                    ● 진행 중
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-400">
                <span>{q._count.questions}문항</span>
                <span>제출 {q._count.submissions}</span>
              </div>
            </Link>
            {q.publishedAt && (
              <Link
                href={`/admin/results?week=${q.week}`}
                className="pr-5 text-xs whitespace-nowrap text-stone-400 hover:text-accent"
              >
                결과 →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
