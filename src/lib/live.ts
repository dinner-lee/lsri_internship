import type { QuestionType, LiveStatus } from "@prisma/client";

// 실시간 세션 상태 페이로드 (폴링 응답)
export interface LiveStatePayload {
  status: LiveStatus;
  index: number; // 현재 문항 순서 (0-base)
  total: number;
  quizTitle: string;
  week: number;
  participantCount: number;
  answeredCount: number;
  joined: boolean;
  isAdmin: boolean;
  participants?: string[]; // 관리자·대기실용 이름 목록
  question: {
    type: QuestionType;
    text: string;
    options: { order: number; label: string }[];
  } | null;
  myAnswered: boolean;
  reveal: {
    correctOptions: number[];
    shortAnswers: string[];
    explanation: string;
    distribution: { order: number; label: string; count: number; correct: boolean }[];
    shortTexts: { text: string; count: number; correct: boolean }[];
    myCorrect: boolean | null;
    ranking: RankEntry[];
    isLast: boolean;
  } | null;
}

export interface RankEntry {
  name: string;
  isMe: boolean;
}

// 순위: 정답 수 내림차순 → 누적 응답 시간 오름차순 (점수 숫자는 노출하지 않음)
export function computeRanking(
  participants: { userId: string; name: string }[],
  answers: { userId: string; isCorrect: boolean; elapsedMs: number }[],
  meId: string
): RankEntry[] {
  const stat = new Map(
    participants.map((p) => [p.userId, { name: p.name, correct: 0, elapsed: 0 }])
  );
  answers.forEach((a) => {
    const s = stat.get(a.userId);
    if (!s) return;
    if (a.isCorrect) s.correct++;
    s.elapsed += a.elapsedMs;
  });
  return [...stat.entries()]
    .sort((a, b) => b[1].correct - a[1].correct || a[1].elapsed - b[1].elapsed)
    .map(([uid, s]) => ({ name: s.name, isMe: uid === meId }));
}
