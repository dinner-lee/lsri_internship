import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HostClient } from "./host-client";

export default async function LiveHostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!session) notFound();

  // 호스트는 전체 문항(정답 포함)을 알고 있어도 된다
  const questions = session.quiz.questions.map((q) => ({
    order: q.order,
    type: q.type,
    text: q.text,
    explanation: q.explanation,
    shortAnswers: q.shortAnswers,
    options: q.options.map((o) => ({ order: o.order, label: o.label, isCorrect: o.isCorrect })),
  }));

  return <HostClient sessionId={id} questions={questions} />;
}
