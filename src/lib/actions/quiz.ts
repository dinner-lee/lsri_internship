"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseQuiz, gradeQuestion, type AnswerInput } from "@/lib/quiz";

export interface QuizFormState {
  error?: string;
  saved?: boolean;
}

// 관리자: 퀴즈 저장(마크다운 → 문항 동기화). id가 없으면 생성.
export async function saveQuizAction(
  _prev: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const week = parseInt(String(formData.get("week") ?? ""), 10);
  const markdown = String(formData.get("markdown") ?? "");
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();
  const publish = String(formData.get("publish") ?? "") === "1";

  if (!Number.isInteger(week) || week < 1) return { error: "주차를 올바르게 입력해주세요" };

  const parsed = parseQuiz(markdown);
  if (publish && parsed.questions.length === 0)
    return { error: "문항이 없는 퀴즈는 발행할 수 없습니다" };

  const dupe = await prisma.quiz.findUnique({ where: { week } });
  if (dupe && dupe.id !== id) return { error: `${week}주차 퀴즈가 이미 존재합니다` };

  const data = {
    week,
    title: parsed.title,
    description: parsed.description,
    timeLimitSec: parsed.timeLimitSec,
    markdown,
    dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
  };

  const quizId = await prisma.$transaction(async (tx) => {
    const quiz = id
      ? await tx.quiz.update({ where: { id }, data })
      : await tx.quiz.create({ data });

    // 문항 재생성 (제출이 있으면 문항 구조 변경 금지)
    const subCount = await tx.submission.count({ where: { quizId: quiz.id } });
    if (subCount === 0) {
      await tx.question.deleteMany({ where: { quizId: quiz.id } });
      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        await tx.question.create({
          data: {
            quizId: quiz.id,
            order: i,
            type: q.type,
            text: q.text,
            explanation: q.explanation,
            shortAnswers: q.shortAnswers,
            options: {
              create: q.options.map((o, oi) => ({
                order: oi,
                label: o.label,
                isCorrect: o.correct,
              })),
            },
          },
        });
      }
    }

    if (publish) {
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { publishedAt: quiz.publishedAt ?? new Date() },
      });
    }
    return quiz.id;
  });

  revalidatePath("/admin/quizzes");
  revalidatePath("/quiz");
  if (!id) redirect(`/admin/quizzes/${quizId}`);
  return { saved: true };
}

// 학습자 공개 토글 — 발행된 퀴즈만, openAt이 null이면 학습자에게 보이지 않음
export async function toggleQuizOpenAction(quizId: string) {
  await requireAdmin();
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || !quiz.publishedAt) return;
  await prisma.quiz.update({
    where: { id: quizId },
    data: { openAt: quiz.openAt ? null : new Date() },
  });
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${quizId}`);
  revalidatePath("/quiz");
}

export async function deleteQuizAction(id: string) {
  await requireAdmin();
  await prisma.quiz.delete({ where: { id } });
  revalidatePath("/admin/quizzes");
  redirect("/admin/quizzes");
}

// 학습자: 퀴즈 제출 → 서버 채점
export async function submitQuizAction(
  quizId: string,
  answers: Record<number, AnswerInput>
): Promise<{ error?: string }> {
  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
  if (!quiz || !quiz.publishedAt || !quiz.openAt) return { error: "퀴즈를 찾을 수 없습니다" };

  const existing = await prisma.submission.findUnique({
    where: { quizId_userId: { quizId, userId: user.id } },
  });
  if (existing) return { error: "이미 제출한 퀴즈입니다" };

  const total = quiz.questions.length || 1;
  let correctCount = 0;
  const answerRows = quiz.questions.map((q) => {
    const a = answers[q.order];
    const isCorrect = gradeQuestion(
      {
        type: q.type,
        shortAnswers: q.shortAnswers,
        options: q.options.map((o) => ({ order: o.order, isCorrect: o.isCorrect })),
      },
      a
    );
    if (isCorrect) correctCount++;
    return {
      questionId: q.id,
      selectedOptions: (a?.selectedOptions ?? []).filter((n) => Number.isInteger(n)),
      text: typeof a?.text === "string" ? a.text.slice(0, 500) : null,
      isCorrect,
    };
  });

  await prisma.submission.create({
    data: {
      quizId,
      userId: user.id,
      score: Math.round((correctCount / total) * 100),
      correctCount,
      total: quiz.questions.length,
      answers: { create: answerRows },
    },
  });

  revalidatePath("/quiz");
  return {};
}
