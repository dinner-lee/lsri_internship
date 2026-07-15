import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf, topicTitleOf } from "@/lib/utils";
import { MemoEditor } from "@/app/(app)/group-memo/[groupId]/memo-editor";
import { MemoLikeButton, MemoComments } from "@/app/(app)/group-memo/[groupId]/interactions";

// 자율연구 모둠 메모장 본문 (페이지·모달 공용)
export async function ResearchMemoView({ groupId }: { groupId: string }) {
  const user = await requireUser();

  const group = await prisma.researchGroup.findUnique({
    where: { id: groupId },
    include: {
      topic: { include: { user: true } },
      members: { include: { user: true } },
      set: {
        include: {
          groups: { orderBy: { index: "asc" }, include: { members: true } },
        },
      },
      memo: true,
      memoLikes: true,
      memoComments: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!group) notFound();

  const isMember = group.members.some((m) => m.userId === user.id);
  const canWrite = isMember || user.role === "ADMIN";
  // 같은 구성의 다른 모둠으로 이동 (내 모둠만 편집, 나머지는 열람)
  const siblings = group.set.groups.map((g) => ({
    id: g.id,
    index: g.index,
    isMine: g.members.some((m) => m.userId === user.id),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-display text-[19px] whitespace-nowrap text-stone-800">
            연구 모둠 {group.index + 1} 메모장
          </span>
          {siblings.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/research-memo/${sib.id}`}
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
        <div className="text-[12.5px] text-stone-500">
          연구 주제: <b className="text-stone-700">{topicTitleOf(group.topic.markdown)}</b>
          <span className="ml-1.5 text-[11px] text-stone-400">
            (작성: {group.topic.user.name.split("/")[0].trim()})
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

      <div className="flex flex-col gap-2">
        <MemoEditor
          key={group.id}
          groupId={group.id}
          endpoint={`/api/research-memo/${group.id}`}
          initialContent={group.memo?.content ?? ""}
          initialVersion={group.memo?.version ?? 0}
          readOnly={!canWrite}
        />
        <div className="flex justify-end">
          <MemoLikeButton
            key={`like-${group.id}`}
            groupId={group.id}
            kind="research"
            liked={group.memoLikes.some((l) => l.userId === user.id)}
            count={group.memoLikes.length}
          />
        </div>
      </div>

      <MemoComments
        key={`comments-${group.id}`}
        groupId={group.id}
        kind="research"
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
