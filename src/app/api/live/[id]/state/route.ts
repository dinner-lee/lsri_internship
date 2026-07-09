import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRanking, type LiveStatePayload } from "@/lib/live";

// 실시간 세션 상태 폴링 엔드포인트
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authSession = await auth();
  if (!authSession?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = authSession.user;

  const s = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
        },
      },
      participants: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      answers: true,
    },
  });
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isAdmin = me.role === "ADMIN";
  const question = s.quiz.questions.find((q) => q.order === s.currentIndex) ?? null;
  const curAnswers = question ? s.answers.filter((a) => a.questionId === question.id) : [];
  const showReveal = s.status === "REVEAL" || s.status === "ENDED";

  const norm = (t: string) => t.replace(/\s+/g, "").toLowerCase();

  const payload: LiveStatePayload = {
    status: s.status,
    index: s.currentIndex,
    total: s.quiz.questions.length,
    quizTitle: s.quiz.title || "(제목 없음)",
    week: s.quiz.week,
    participantCount: s.participants.length,
    answeredCount: curAnswers.length,
    joined: s.participants.some((p) => p.userId === me.id),
    isAdmin,
    participants:
      isAdmin || s.status === "LOBBY" ? s.participants.map((p) => p.user.name) : undefined,
    question:
      question && s.status !== "LOBBY" && s.status !== "ENDED"
        ? {
            type: question.type,
            text: question.text,
            options: question.options.map((o) => ({ order: o.order, label: o.label })),
          }
        : null,
    myAnswered: curAnswers.some((a) => a.userId === me.id),
    reveal:
      showReveal && question
        ? (() => {
            const myAnswer = curAnswers.find((a) => a.userId === me.id);
            const textGroups = new Map<string, { text: string; count: number; correct: boolean }>();
            curAnswers.forEach((a) => {
              if (question.type !== "SHORT" || !a.text?.trim()) return;
              const key = norm(a.text);
              const g = textGroups.get(key);
              if (g) g.count++;
              else textGroups.set(key, { text: a.text.trim(), count: 1, correct: a.isCorrect });
            });
            return {
              correctOptions: question.options.filter((o) => o.isCorrect).map((o) => o.order),
              shortAnswers: question.shortAnswers,
              explanation: question.explanation,
              distribution: question.options.map((o) => ({
                order: o.order,
                label: o.label,
                count: curAnswers.filter((a) => a.selectedOptions.includes(o.order)).length,
                correct: o.isCorrect,
              })),
              shortTexts: [...textGroups.values()].sort((a, b) => b.count - a.count).slice(0, 8),
              myCorrect: myAnswer ? myAnswer.isCorrect : null,
              ranking: computeRanking(
                s.participants.map((p) => ({ userId: p.userId, name: p.user.name })),
                s.answers.map((a) => ({
                  userId: a.userId,
                  isCorrect: a.isCorrect,
                  elapsedMs: a.elapsedMs,
                })),
                me.id
              ),
              isLast: s.currentIndex + 1 >= s.quiz.questions.length,
            };
          })()
        : null,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
