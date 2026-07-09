"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { gradeQuestion, type AnswerInput } from "@/lib/quiz";

// 관리자: 실시간 세션 시작 (진행 중인 세션이 있으면 그 세션으로)
export async function startLiveSessionAction(quizId: string) {
  await requireAdmin();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  });
  if (!quiz || !quiz.publishedAt || quiz._count.questions === 0) return;

  const existing = await prisma.liveSession.findFirst({
    where: { quizId, status: { not: "ENDED" } },
    orderBy: { createdAt: "desc" },
  });
  const session =
    existing ?? (await prisma.liveSession.create({ data: { quizId } }));
  redirect(`/admin/live/${session.id}`);
}

// 학습자: 세션 참여
export async function joinLiveAction(sessionId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "세션을 찾을 수 없습니다" };
  if (session.status === "ENDED") return { error: "이미 종료된 세션입니다" };
  await prisma.liveParticipant.upsert({
    where: { sessionId_userId: { sessionId, userId: user.id } },
    update: {},
    create: { sessionId, userId: user.id },
  });
  return {};
}

// 학습자: 현재 문항 답 제출 → 전원 제출 시 자동으로 결과 공개
export async function submitLiveAnswerAction(
  sessionId: string,
  answer: AnswerInput
): Promise<{ error?: string }> {
  const user = await requireUser();
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!session || session.status !== "QUESTION") return { error: "지금은 제출할 수 없습니다" };

  const question = session.quiz.questions.find((q) => q.order === session.currentIndex);
  if (!question) return { error: "문항을 찾을 수 없습니다" };

  const isCorrect = gradeQuestion(
    {
      type: question.type,
      shortAnswers: question.shortAnswers,
      options: question.options.map((o) => ({ order: o.order, isCorrect: o.isCorrect })),
    },
    answer
  );
  const elapsedMs = session.questionStartedAt
    ? Math.max(0, Date.now() - session.questionStartedAt.getTime())
    : 0;

  try {
    await prisma.liveAnswer.create({
      data: {
        sessionId,
        userId: user.id,
        questionId: question.id,
        selectedOptions: (answer.selectedOptions ?? []).filter((n) => Number.isInteger(n)),
        text: typeof answer.text === "string" ? answer.text.slice(0, 500) : null,
        isCorrect,
        elapsedMs,
      },
    });
  } catch {
    return { error: "이미 제출했습니다" };
  }

  // 참가자 전원이 제출했으면 자동 공개
  const [answered, participants] = await Promise.all([
    prisma.liveAnswer.count({ where: { sessionId, questionId: question.id } }),
    prisma.liveParticipant.count({ where: { sessionId } }),
  ]);
  if (answered >= participants) {
    await prisma.liveSession.updateMany({
      where: { id: sessionId, status: "QUESTION", currentIndex: session.currentIndex },
      data: { status: "REVEAL" },
    });
  }
  return {};
}

// 관리자: 진행 (대기실→첫 문제 / 문제→결과 공개 / 결과→다음 문제 또는 종료)
export async function advanceLiveAction(sessionId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { _count: { select: { questions: true } } } } },
  });
  if (!session) return { error: "세션을 찾을 수 없습니다" };
  const total = session.quiz._count.questions;

  if (session.status === "LOBBY") {
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: "QUESTION", currentIndex: 0, questionStartedAt: new Date() },
    });
  } else if (session.status === "QUESTION") {
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: "REVEAL" },
    });
  } else if (session.status === "REVEAL") {
    if (session.currentIndex + 1 < total) {
      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: "QUESTION",
          currentIndex: session.currentIndex + 1,
          questionStartedAt: new Date(),
        },
      });
    } else {
      await endSession(sessionId);
    }
  }
  return {};
}

// 관리자: 세션 강제 종료
export async function endLiveAction(sessionId: string): Promise<{ error?: string }> {
  await requireAdmin();
  await endSession(sessionId);
  return {};
}

// 종료 처리 + 결과를 일반 제출(Submission)로 반영 (제출 현황·모둠 구성에서 활용)
async function endSession(sessionId: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { include: { questions: true } },
      participants: true,
      answers: true,
    },
  });
  if (!session || session.status === "ENDED") return;

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "ENDED" },
  });

  const total = session.quiz.questions.length || 1;
  for (const p of session.participants) {
    const exists = await prisma.submission.findUnique({
      where: { quizId_userId: { quizId: session.quizId, userId: p.userId } },
    });
    if (exists) continue;
    const mine = session.answers.filter((a) => a.userId === p.userId);
    const correctCount = mine.filter((a) => a.isCorrect).length;
    await prisma.submission.create({
      data: {
        quizId: session.quizId,
        userId: p.userId,
        score: Math.round((correctCount / total) * 100),
        correctCount,
        total: session.quiz.questions.length,
        answers: {
          create: mine.map((a) => ({
            questionId: a.questionId,
            selectedOptions: a.selectedOptions,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        },
      },
    });
  }
}
