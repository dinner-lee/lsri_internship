import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseQuiz } from "../src/lib/quiz";

const prisma = new PrismaClient();

const SAMPLE_MD = `# 6주차 · 연구방법론 기초
설명: 표본추출과 타당도 개념을 확인합니다
시간: 15분

## 1. 다음 중 확률표본추출 방법이 아닌 것은?
- ( ) 단순무작위추출
- (x) 눈덩이표집
- ( ) 층화표집
- ( ) 군집표집
해설: 눈덩이표집은 기존 참여자의 소개로 표본을 확보하는 비확률표본추출 방법입니다.

## 2. [복수] 내적 타당도를 위협하는 요인을 모두 고르시오.
- (x) 역사(history)
- (x) 성숙(maturation)
- ( ) 무작위 배정
- (x) 피험자 탈락
해설: 무작위 배정은 오히려 내적 타당도를 높이는 장치입니다. 나머지는 대표적 위협 요인입니다.

## 3. [단답] 측정하려는 개념을 실제로 측정하고 있는 정도를 무엇이라 하는가?
답: 타당도 | 타당성
해설: 타당도(validity)는 측정의 정확성, 신뢰도(reliability)는 측정의 일관성을 뜻합니다.

## 4. 표본 크기를 늘릴 때 일반적으로 기대되는 효과는?
- ( ) 측정 도구의 타당도 상승
- (x) 표본오차 감소
- ( ) 무응답 편향 제거
해설: 표본이 클수록 표본오차는 줄지만, 타당도나 무응답 편향은 표본 크기와 별개의 문제입니다.
`;

async function upsertQuizFromMarkdown(week: number, markdown: string, publish: boolean) {
  const parsed = parseQuiz(markdown);
  const quiz = await prisma.quiz.upsert({
    where: { week },
    update: {},
    create: {
      week,
      title: parsed.title,
      description: parsed.description,
      timeLimitSec: parsed.timeLimitSec,
      markdown,
      publishedAt: publish ? new Date() : null,
      questions: {
        create: parsed.questions.map((q, i) => ({
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
        })),
      },
    },
  });
  return quiz;
}

async function main() {
  // 초대 코드
  await prisma.inviteCode.upsert({
    where: { code: "CLASS2026" },
    update: {},
    create: { code: "CLASS2026", role: "LEARNER" },
  });
  await prisma.inviteCode.upsert({
    where: { code: "TEACHER2026" },
    update: {},
    create: { code: "TEACHER2026", role: "ADMIN" },
  });

  // 관리자 계정
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "관리자",
      passwordHash: await bcrypt.hash("quizlab-admin", 10),
      role: "ADMIN",
    },
  });

  // 샘플 퀴즈 (6주차, 발행됨)
  await upsertQuizFromMarkdown(6, SAMPLE_MD, true);

  console.log("✔ 기본 시드 완료 — 관리자: admin / quizlab-admin, 초대코드: CLASS2026(학습자) · TEACHER2026(관리자)");

  // SEED_DEMO=1 이면 데모 학생 20명 + 제출 생성
  if (process.env.SEED_DEMO === "1") {
    const W5_MD = `# 5주차 · 가설 검정
설명: 가설 검정의 기초 개념을 확인합니다
시간: 15분

## 1. 귀무가설이 참인데 기각하는 오류는?
- (x) 1종 오류
- ( ) 2종 오류
- ( ) 표본 오류
해설: 참인 귀무가설을 기각하면 1종 오류(α), 거짓인 귀무가설을 기각하지 못하면 2종 오류(β)입니다.

## 2. [복수] 유의수준에 대한 설명으로 옳은 것을 모두 고르시오.
- (x) 연구자가 사전에 정한다
- (x) 1종 오류의 허용 확률이다
- ( ) 표본 크기가 결정한다
해설: 유의수준 α는 연구자가 분석 전에 설정하는 1종 오류 허용 기준입니다.

## 3. [단답] 효과가 없다고 가정하는 기본 가설을 무엇이라 하는가?
답: 귀무가설 | 영가설
해설: 연구가설(대립가설)과 달리 차이·효과가 없음을 가정하는 가설입니다.
`;
    await upsertQuizFromMarkdown(5, W5_MD, true);

    const NAMES = ["김서연","이준호","박민지","최현우","정다은","강태윤","윤지호","임수빈","한예린","오도윤","신아름","송민재","배지우","조은채","문성현","홍라온","전유나","백승우","노하늘","서지안"];
    const hash = await bcrypt.hash("student123", 10);
    const quizzes = await prisma.quiz.findMany({
      where: { week: { in: [5, 6] } },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });

    for (let i = 0; i < NAMES.length; i++) {
      const user = await prisma.user.upsert({
        where: { username: `student${i + 1}` },
        update: {},
        create: { username: `student${i + 1}`, name: NAMES[i], passwordHash: hash, role: "LEARNER" },
      });

      for (const quiz of quizzes) {
        const existing = await prisma.submission.findUnique({
          where: { quizId_userId: { quizId: quiz.id, userId: user.id } },
        });
        if (existing) continue;

        // 무작위 정오답 제출 생성
        let correctCount = 0;
        const answers = quiz.questions.map((q) => {
          const correct = Math.random() < 0.65;
          if (correct) correctCount++;
          if (q.type === "SHORT") {
            return {
              questionId: q.id,
              selectedOptions: [] as number[],
              text: correct ? q.shortAnswers[0] : "오답",
              isCorrect: correct,
            };
          }
          const correctOrders = q.options.filter((o) => o.isCorrect).map((o) => o.order);
          const wrongOrders = q.options.filter((o) => !o.isCorrect).map((o) => o.order);
          return {
            questionId: q.id,
            selectedOptions: correct ? correctOrders : wrongOrders.slice(0, 1),
            text: null,
            isCorrect: correct,
          };
        });
        const total = quiz.questions.length;
        await prisma.submission.create({
          data: {
            quizId: quiz.id,
            userId: user.id,
            score: Math.round((correctCount / total) * 100),
            correctCount,
            total,
            answers: { create: answers },
          },
        });
      }
    }
    // 데모 연구 주제 (네트워크 그래프 확인용)
    const DEMO_TOPICS: { username: string; title: string; body: string; keywords: string[] }[] = [
      { username: "student1", title: "대학생의 SNS 사용과 수면의 질", body: "## 대학생의 SNS 사용과 수면의 질\n\n숏폼 콘텐츠 시청 시간이 수면 잠복기와 주간 피로도에 미치는 영향을 알아보고 싶다.\n\n- 설문 + 수면 일지 병행", keywords: ["수면", "SNS", "설문조사"] },
      { username: "student2", title: "생성형 AI와 과제 표절 인식", body: "## 생성형 AI와 과제 표절 인식\n\n학생과 교수자가 생각하는 AI 활용 허용선 비교.\n\n- 시나리오 기반 설문", keywords: ["AI", "학습윤리", "설문조사"] },
      { username: "student3", title: "캠퍼스 공간과 학습 집중도", body: "## 캠퍼스 공간과 학습 집중도\n\n공간 유형에 따른 집중 지속 시간 관찰.\n\n- 경험표집법(ESM) 활용", keywords: ["공간", "집중력", "관찰연구"] },
      { username: "student4", title: "단체 채팅방의 침묵 규범", body: "## 단체 채팅방의 침묵 규범\n\n수업 단톡방에서 침묵이 유지되는 메커니즘 탐구.\n\n- 담화 분석 + 심층 인터뷰", keywords: ["커뮤니케이션", "질적연구", "SNS"] },
      { username: "student5", title: "구독 서비스 해지 결정 요인", body: "## 구독 서비스 해지 결정 요인\n\nOTT·음악 구독 해지의 심리적 계기 파악.\n\n- 회고적 인터뷰", keywords: ["소비자행동", "구독경제", "인터뷰"] },
      { username: "student6", title: "교양 수업 팀플 무임승차", body: "## 교양 수업 팀플 무임승차\n\n무임승차가 발생하는 팀의 구조적 특징 분석.\n\n- 사례 비교 연구", keywords: ["협동학습", "팀워크", "설문조사"] },
      { username: "student7", title: "배달앱 리뷰의 언어 패턴", body: "## 배달앱 리뷰의 언어 패턴\n\n별점과 리뷰 감성의 불일치 사례 텍스트마이닝.\n\n- 크롤링 + 감성 분석", keywords: ["텍스트마이닝", "AI", "소비자행동"] },
      { username: "student8", title: "온라인 강의 배속 시청과 학습", body: "## 온라인 강의 배속 시청과 학습\n\n배속 시청이 이해도와 기억에 미치는 영향.\n\n- 실험 연구", keywords: ["학습전략", "집중력", "실험연구"] },
    ];
    for (const dt of DEMO_TOPICS) {
      const u = await prisma.user.findUnique({ where: { username: dt.username } });
      if (!u) continue;
      await prisma.topic.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id, markdown: dt.body, keywords: dt.keywords },
      });
    }

    console.log("✔ 데모 학생 20명 + 6주차 제출 + 연구 주제 8건 생성 (student1–20 / student123)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
