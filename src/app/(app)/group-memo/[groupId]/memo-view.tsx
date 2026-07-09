import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf, formatDateTime } from "@/lib/utils";
import { MemoEditor } from "./memo-editor";
import { WeekPicker } from "./week-picker";
import { MemoLikeButton, MemoComments } from "./interactions";

// 페이지와 모달에서 공유하는 메모장 본문
export async function MemoView({ groupId }: { groupId: string }) {
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-display text-[19px] whitespace-nowrap text-stone-800">
            모둠 {group.index + 1} 메모장
          </span>
          {setChips.length > 0 && (
            <WeekPicker
              options={setChips.filter((c) => c.groupId).map((c) => ({
                setId: c.setId,
                groupId: c.groupId!,
                label: c.label,
              }))}
              activeSetId={group.groupSetId}
            />
          )}
          {siblings.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/group-memo/${sib.id}`}
                  replace
                  className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${
                    sib.id === group.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  모둠 {sib.index + 1}
                  {sib.isMine && " (내 모둠)"}
                </Link>
              ))}
            </div>
          )}
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


      <div className="flex flex-col gap-2">
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
