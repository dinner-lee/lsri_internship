import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { typeLabel } from "@/lib/quiz";

export default async function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const submission = await prisma.submission.findUnique({
    where: { quizId_userId: { quizId: id, userId: user.id } },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
      answers: true,
    },
  });
  if (!submission) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) notFound();
    redirect(`/quiz/${id}/take`);
  }

  const answerByQ = new Map(submission.answers.map((a) => [a.questionId, a]));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/quiz" className="text-xs text-stone-400 hover:text-stone-600">
        ← 퀴즈 홈으로
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-stone-400">
            {submission.quiz.week}주차 퀴즈
          </span>
          <span className="font-display text-[19px] font-normal tracking-tight">
            {submission.quiz.title || "(제목 없음)"}
          </span>
          <span className="text-[13px] text-stone-500">
            {submission.correctCount}/{submission.total} 정답
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[44px] font-bold tracking-tighter text-accent">
            {submission.score}
          </span>
          <span className="text-[15px] text-stone-400">점</span>
        </div>
      </div>

      {submission.quiz.questions.map((q) => {
        const a = answerByQ.get(q.id);
        const ok = a?.isCorrect ?? false;
        const sel = new Set(a?.selectedOptions ?? []);
        return (
          <div
            key={q.id}
            className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[26px] py-6"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex-none rounded-[7px] px-2 py-1 text-[11.5px] font-bold ${
                  ok ? "bg-accent-soft text-accent" : "bg-bad-soft text-bad"
                }`}
              >
                {ok ? "정답" : "오답"}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-stone-400">
                  Q{q.order + 1} · {typeLabel(q.type)}
                </span>
                <span className="text-[15px] leading-normal font-semibold text-stone-800">
                  {q.text}
                </span>
              </div>
            </div>

            {q.type !== "SHORT" ? (
              <div className="flex flex-col gap-[7px]">
                {q.options.map((opt) => {
                  const chosen = sel.has(opt.order);
                  const wrongPick = chosen && !opt.isCorrect;
                  const tags = [
                    ...(opt.isCorrect ? ["정답"] : []),
                    ...(chosen ? ["내 답"] : []),
                  ].join(" · ");
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between rounded-[10px] border-[1.5px] px-4 py-2.5 ${
                        opt.isCorrect
                          ? "border-accent bg-accent-soft"
                          : wrongPick
                            ? "border-bad bg-bad-soft"
                            : "border-line-soft bg-white"
                      }`}
                    >
                      <span className="text-[13.5px] text-stone-800">{opt.label}</span>
                      <span
                        className={`text-[11.5px] font-semibold ${
                          opt.isCorrect ? "text-accent" : wrongPick ? "text-bad" : "text-stone-400"
                        }`}
                      >
                        {tags}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-[7px] text-[13px]">
                <div className="flex gap-2.5">
                  <span className="w-11 flex-none text-stone-400">내 답</span>
                  <span className={`font-semibold ${ok ? "text-accent" : "text-bad"}`}>
                    {(a?.text ?? "").trim() || "(무응답)"}
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <span className="w-11 flex-none text-stone-400">정답</span>
                  <span className="font-semibold text-accent">{q.shortAnswers.join(" / ")}</span>
                </div>
              </div>
            )}

            {q.explanation && (
              <div className="flex gap-2.5 rounded-[10px] bg-paper px-4 py-3.5">
                <span className="mt-px flex-none text-[11.5px] font-bold text-stone-500">해설</span>
                <span className="text-[13px] leading-[1.65] text-stone-600">{q.explanation}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
