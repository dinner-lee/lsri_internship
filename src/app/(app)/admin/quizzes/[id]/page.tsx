import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuizEditor } from "./quiz-editor";

const TEMPLATE = `# N주차 · 퀴즈 제목
설명: 퀴즈에 대한 간단한 설명
시간: 15분

## 1. 첫 번째 문항 (선다형)
- (x) 정답 선지
- ( ) 오답 선지
- ( ) 오답 선지
해설: 정답에 대한 해설을 적어주세요.

## 2. [복수] 두 번째 문항 (복수 선택)
- (x) 정답 선지 A
- (x) 정답 선지 B
- ( ) 오답 선지
해설: 해설

## 3. [단답] 세 번째 문항 (단답형)
답: 정답1 | 정답2
해설: 해설
`;

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "new") {
    const maxWeek = await prisma.quiz.aggregate({ _max: { week: true } });
    return (
      <QuizEditor
        quizId=""
        initialWeek={(maxWeek._max.week ?? 0) + 1}
        initialMarkdown={TEMPLATE}
        initialDueAt=""
        published={false}
        submissionCount={0}
      />
    );
  }

  const [quiz, liveSession] = await Promise.all([
    prisma.quiz.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    }),
    // 이 퀴즈로 진행 중인 실시간 세션이 있으면 시작 대신 재진입 링크 표시
    prisma.liveSession.findFirst({
      where: { quizId: id, status: { not: "ENDED" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!quiz) notFound();

  const toLocal = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <QuizEditor
      quizId={quiz.id}
      initialWeek={quiz.week}
      initialMarkdown={quiz.markdown}
      initialDueAt={quiz.dueAt ? toLocal(quiz.dueAt) : ""}
      published={!!quiz.publishedAt}
      submissionCount={quiz._count.submissions}
      liveSessionId={liveSession?.id ?? null}
    />
  );
}
