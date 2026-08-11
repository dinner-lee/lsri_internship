import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { QuestionBoard } from "@/components/question-board";
import { RefreshOnFocus } from "@/components/refresh";

// 좋아요를 많이 누른 순 랭킹 (관리자 전용)
async function LikeRanking() {
  const grouped = await prisma.qnaLike.groupBy({
    by: ["userId"],
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
  });
  if (grouped.length === 0) return null;

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.name.split("/")[0].trim() ?? "(알 수 없음)";

  // 동점자는 같은 순위로 표시 (같은 횟수의 첫 등장 위치 + 1)
  const rows = grouped.map((g) => ({
    userId: g.userId,
    rank: grouped.findIndex((o) => o._count._all === g._count._all) + 1,
    count: g._count._all,
  }));

  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-white shadow-[0_18px_44px_-26px_rgba(30,50,90,.32),0_1px_3px_rgba(30,50,90,.04)] px-5 py-4">
      <span className="text-[12.5px] font-semibold text-stone-600">
        <span className="text-bad/70">♥</span> 좋아요 랭킹
        <span className="ml-1.5 font-normal text-stone-400">좋아요를 많이 누른 순</span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span
            key={r.userId}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] ${
              r.rank === 1
                ? "border-bad-border bg-bad-soft font-semibold text-bad"
                : "border-line bg-paper text-stone-600"
            }`}
          >
            <b className="text-[11px] font-bold">{r.rank}위</b>
            {nameOf(r.userId)}
            <span className={r.rank === 1 ? "text-bad/80" : "text-stone-400"}>{r.count}회</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function AdminQuestionsPage() {
  const user = await requireAdmin();

  return (
    <div className="flex flex-col gap-[18px]">
      <RefreshOnFocus />
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">질문 게시판</div>
        <div className="text-[12.5px] text-stone-400">
          학습자들이 올린 질문을 확인하고 댓글로 답합니다 · 모든 질문·댓글을 삭제할 수 있습니다
        </div>
      </div>
      <LikeRanking />
      <QuestionBoard userId={user.id} isAdmin />
    </div>
  );
}
