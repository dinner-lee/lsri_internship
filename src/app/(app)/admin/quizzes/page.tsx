import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startLiveSessionAction } from "@/lib/actions/live";

export default async function AdminQuizzesPage() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { week: "desc" },
    include: { _count: { select: { questions: true, submissions: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[17px] font-bold tracking-tight">퀴즈 작성</div>
          <div className="text-[12.5px] text-stone-400">
            주차별 퀴즈를 만들고 학습자에게 발행합니다
          </div>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="font-display rounded-[9px] bg-accent px-5 py-2.5 text-[13.5px] text-white hover:bg-accent-strong"
        >
          + 새 퀴즈
        </Link>
      </div>

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
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-400">
                <span>{q._count.questions}문항</span>
                <span>제출 {q._count.submissions}</span>
              </div>
            </Link>
            {q.publishedAt && q._count.questions > 0 && (
              <form action={startLiveSessionAction.bind(null, q.id)} className="pr-4">
                <button className="cursor-pointer rounded-lg border border-bad-border bg-bad-soft px-3 py-1.5 text-[11.5px] font-bold whitespace-nowrap text-bad hover:opacity-80">
                  ● 실시간 진행
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
