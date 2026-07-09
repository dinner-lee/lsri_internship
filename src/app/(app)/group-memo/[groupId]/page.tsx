import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf } from "@/lib/utils";
import { MemoEditor } from "./memo-editor";

export default async function GroupMemoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

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
    },
  });
  if (!group) notFound();

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={user.role === "ADMIN" ? "/admin/groups" : "/quiz"}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            ← 돌아가기
          </Link>
          <div className="font-display text-[17px] text-stone-800">
            모둠 {group.index + 1} 메모장
            <span className="ml-2 text-[12.5px] text-stone-400">
              {group.groupSet.quiz.week}주차 모둠 ·{" "}
              {canWrite ? "모둠원과 실시간으로 함께 작성됩니다" : "읽기 전용"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
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

      {siblings.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
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
    </div>
  );
}
