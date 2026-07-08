import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { initialOf, formatDateTime } from "@/lib/utils";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const quizzes = await prisma.quiz.findMany({ orderBy: { week: "asc" } });
  if (quizzes.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 만든 퀴즈가 없습니다.{" "}
        <Link href="/admin/quizzes/new" className="text-accent underline">
          첫 퀴즈 만들기
        </Link>
      </div>
    );
  }

  const selected =
    quizzes.find((q) => String(q.week) === week) ?? quizzes[quizzes.length - 1];

  const [submissions, learnerCount] = await Promise.all([
    prisma.submission.findMany({
      where: { quizId: selected.id },
      include: { user: true },
      orderBy: { score: "desc" },
    }),
    prisma.user.count({ where: { role: "LEARNER" } }),
  ]);

  const scores = submissions.map((s) => s.score);
  const avg = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "–";
  const stats = [
    { label: "제출", value: `${submissions.length}/${learnerCount}`, accent: false },
    { label: "평균 점수", value: avg, accent: true },
    { label: "최고 점수", value: scores.length ? Math.max(...scores) : "–", accent: false },
    { label: "최저 점수", value: scores.length ? Math.min(...scores) : "–", accent: false },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">
          제출 현황 · {selected.title || "(제목 없음)"}
        </div>
        <div className="text-[12.5px] text-stone-400">
          {selected.week}주차 · {submissions.length}명 제출
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quizzes.map((q) => {
          const active = q.id === selected.id;
          return (
            <Link
              key={q.id}
              href={`/admin/results?week=${q.week}`}
              className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {q.week}주차
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1 rounded-xl border border-line bg-white px-[18px] py-4"
          >
            <span className="font-display text-[12px] text-stone-400">{s.label}</span>
            <span
              className={`text-[22px] font-bold tracking-tight ${
                s.accent ? "text-accent" : "text-stone-900"
              }`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-[44px_1fr_110px_70px_110px] gap-2 border-b border-line-soft px-5 py-[11px] text-[11px] font-semibold text-stone-400">
          <span>#</span>
          <span>이름</span>
          <span>정답 수</span>
          <span className="text-right">점수</span>
          <span className="text-right">제출 시각</span>
        </div>
        {submissions.length === 0 && (
          <div className="px-5 py-4 text-[13px] text-stone-400">아직 제출이 없습니다.</div>
        )}
        {submissions.map((s, i) => (
          <div
            key={s.id}
            className="grid grid-cols-[44px_1fr_110px_70px_110px] items-center gap-2 border-b border-[#f7f6f4] px-5 py-3 last:border-b-0"
          >
            <span className="text-xs text-stone-400">{i + 1}</span>
            <div className="flex items-center gap-2">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-line text-[10.5px] font-semibold text-stone-600">
                {initialOf(s.user.name)}
              </div>
              <span className="text-[13px] font-medium text-stone-800">{s.user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-[5px] w-[52px] overflow-hidden rounded-[3px] bg-line-soft">
                <div
                  className="h-full rounded-[3px] bg-accent"
                  style={{ width: `${s.score}%` }}
                />
              </div>
              <span className="text-xs text-stone-500">
                {s.correctCount}/{s.total}
              </span>
            </div>
            <span className="text-right text-[13.5px] font-bold text-accent">{s.score}</span>
            <span className="text-right text-[11.5px] text-stone-400">
              {formatDateTime(s.submittedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
