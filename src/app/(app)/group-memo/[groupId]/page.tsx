import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf, formatDateTime } from "@/lib/utils";
import { MemoEditor } from "./memo-editor";
import { MemoLikeButton, MemoComments } from "./interactions";

export default async function GroupMemoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  // 확정된 모든 구성 (이전 주차 메모장 탐색용)
  const confirmedSetsPromise = prisma.groupSet.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      quiz: true,
      groups: { orderBy: { index: "asc" }, include: { members: true } },
    },
  });

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      groupSet: {
        include: {
          quiz: true,
          groups: { orderBy: { index: "asc" }, include: { members: true } },
        },
      },
      memo: true,
      memoLikes: true,
      memoComments: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!group) notFound();
  const confirmedSets = await confirmedSetsPromise;

  // 주차 선택 칩: 각 구성에서 내 모둠(없으면 첫 모둠)으로 연결
  const weekSeen = new Map<number, number>();
  const setChips = confirmedSets.map((gs) => {
    const mine = gs.groups.find((g) => g.members.some((m) => m.userId === user.id));
    const target = mine ?? gs.groups[0];
    const nth = weekSeen.get(gs.quiz.week) ?? 0;
    weekSeen.set(gs.quiz.week, nth + 1);
    return {
      setId: gs.id,
      groupId: target?.id,
      label:
        nth === 0
          ? `${gs.quiz.week}주차`
          : `${gs.quiz.week}주차 · ${formatDateTime(gs.confirmedAt!)}`,
      active: gs.id === group.groupSetId,
    };
  });

  const isMember = group.members.some((m) => m.userId === user.id);
  const canWrite = isMember || user.role === "ADMIN";
  // 같은 구성의 다른 모둠으로 이동 (내 모둠만 편집, 나머지는 열람)
  const siblings = group.groupSet.groups.map((g) => ({
    id: g.id,
    index: g.index,
    isMine: g.members.some((m) => m.userId === user.id),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5">
        <Link
          href={user.role === "ADMIN" ? "/admin/groups" : "/quiz"}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-800"
        >
          ← 돌아가기
        </Link>
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[19px] whitespace-nowrap text-stone-800">
            모둠 {group.index + 1} 메모장
          </span>
          <span className="text-[12.5px] whitespace-nowrap text-stone-400">
            {group.groupSet.quiz.week}주차 모둠 ·{" "}
            {canWrite ? "모둠원과 실시간으로 함께 작성됩니다" : "읽기 전용"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pr-2.5 pl-1"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-line text-[9.5px] font-semibold text-stone-600">
                {initialOf(m.user.name)}
              </div>
              <span className="text-[11.5px] font-medium text-stone-700">
                {m.userId === user.id ? `${m.user.name} (나)` : m.user.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {setChips.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11.5px] font-semibold text-stone-400">주차</span>
          {setChips.map(
            (c) =>
              c.groupId && (
                <Link
                  key={c.setId}
                  href={`/group-memo/${c.groupId}`}
                  className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
                    c.active
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {c.label}
                </Link>
              )
          )}
        </div>
      )}

      {siblings.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11.5px] font-semibold text-stone-400">모둠</span>
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/group-memo/${s.id}`}
              className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
                s.id === group.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              모둠 {s.index + 1}
              {s.isMine && " (내 모둠)"}
            </Link>
          ))}
        </div>
      )}

      <MemoEditor
        key={group.id}
        groupId={group.id}
        initialContent={group.memo?.content ?? ""}
        initialVersion={group.memo?.version ?? 0}
        readOnly={!canWrite}
      />

      <div className="flex justify-end">
        <MemoLikeButton
          key={`like-${group.id}`}
          groupId={group.id}
          liked={group.memoLikes.some((l) => l.userId === user.id)}
          count={group.memoLikes.length}
        />
      </div>

      <MemoComments
        key={`comments-${group.id}`}
        groupId={group.id}
        myName={user.name ?? ""}
        comments={group.memoComments.map((c) => ({
          id: c.id,
          name: c.user.name,
          text: c.text,
        }))}
      />
    </div>
  );
}
