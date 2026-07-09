import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { initialOf, formatDateTime } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";

export default async function AdminDiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const confirmedSets = await prisma.groupSet.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      quiz: true,
      groups: {
        orderBy: { index: "asc" },
        include: {
          members: { include: { user: true } },
          memo: { include: { updatedBy: { select: { name: true } } } },
          memoLikes: true,
          _count: { select: { memoComments: true } },
        },
      },
    },
  });

  if (confirmedSets.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 확정된 모둠이 없습니다.{" "}
        <Link href="/admin/groups" className="text-accent underline">
          모둠 구성으로 이동
        </Link>
      </div>
    );
  }

  // 주차별 최신 확정 구성만 선택지로 제공 (목록이 최신순이므로 첫 등장이 최신)
  const weekSets = [...new Map(confirmedSets.map((gs) => [gs.quiz.week, gs])).entries()].sort(
    (a, b) => b[0] - a[0]
  );
  const selected =
    weekSets.find(([w]) => String(w) === week)?.[1] ?? weekSets[0][1];

  return (
    <div className="flex flex-col gap-[18px]">
      <AutoRefresh />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[17px] font-bold tracking-tight">논의</div>
          <div className="text-[12.5px] text-stone-400">
            모든 모둠의 메모장을 한눈에 확인합니다 · 5초마다 자동 갱신
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {weekSets.map(([w, gs]) => (
          <Link
            key={gs.id}
            href={`/admin/discussions?week=${w}`}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
              gs.id === selected.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {w}주차
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {selected.groups.map((g) => (
          <div
            key={g.id}
            className="flex flex-col overflow-hidden rounded-xl border border-line bg-white"
          >
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[14px] font-bold">모둠 {g.index + 1}</span>
                <div className="flex -space-x-1.5">
                  {g.members.map((m) => (
                    <span
                      key={m.id}
                      title={m.user.name}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-line text-[9.5px] font-semibold text-stone-600"
                    >
                      {initialOf(m.user.name)}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/group-memo/${g.id}`}
                className="text-xs text-stone-400 hover:text-accent"
              >
                메모장 열기 →
              </Link>
            </div>

            <div className="max-h-72 min-h-32 flex-1 overflow-y-auto px-5 py-4">
              {g.memo?.content ? (
                <div className="text-[13px] leading-[1.8] whitespace-pre-wrap text-stone-800">
                  {g.memo.content}
                </div>
              ) : (
                <div className="py-6 text-center text-[12.5px] text-stone-300">
                  아직 작성된 내용이 없습니다
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line-soft bg-paper px-5 py-2.5 text-[11.5px] text-stone-400">
              <span>
                ♥ {g.memoLikes.length} · 💬 {g._count.memoComments}
              </span>
              {g.memo && (
                <span>
                  마지막 수정 {g.memo.updatedBy ? `${g.memo.updatedBy.name} · ` : ""}
                  {formatDateTime(g.memo.updatedAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
