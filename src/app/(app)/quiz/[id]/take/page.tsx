import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TakeQuizClient } from "./take-client";

export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!quiz || !quiz.publishedAt) notFound();

  const existing = await prisma.submission.findUnique({
    where: { quizId_userId: { quizId: id, userId: user.id } },
  });
  if (existing) redirect(`/quiz/${id}/result`);

  // 정답/해설은 클라이언트로 보내지 않는다
  const questions = quiz.questions.map((q) => ({
    order: q.order,
    type: q.type,
    text: q.text,
    options: q.options.map((o) => ({ order: o.order, label: o.label })),
  }));

  return (
    <TakeQuizClient
      quizId={quiz.id}
      title={quiz.title || "(제목 없음)"}
      timeLimitSec={quiz.timeLimitSec}
      questions={questions}
    />
  );
}
