import { prisma } from "@/lib/prisma";
import { formatDateTime, topicTitleOf } from "@/lib/utils";
import { UserAvatar } from "@/components/user-menu";
import { LinkIcon, QnaIcon } from "@/components/icons";
import {
  GroupTopicEditor,
  AddLinkForm,
  ShowcaseDeleteButton,
  GuestQuestionEditButton,
  AnswerComposer,
  GuestQuestionForm,
} from "@/components/showcase-client";

type Viewer =
  | { mode: "member"; userId: string; isAdmin: boolean }
  | { mode: "guest"; token: string };

// 결과보고회 모둠 카드 보드 — 학습자·관리자(/showcase)와 게스트(/guest/[token]) 공용
export async function ShowcaseBoard({ viewer }: { viewer: Viewer }) {
  const set = await prisma.researchGroupSet.findFirst({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      groups: {
        orderBy: { index: "asc" },
        include: {
          topic: { select: { markdown: true } },
          members: { include: { user: { select: { name: true, image: true } } } },
          showcaseLinks: { orderBy: { createdAt: "asc" } },
          guestQuestions: {
            orderBy: { createdAt: "desc" },
            include: {
              answers: {
                orderBy: { createdAt: "asc" },
                include: { user: { select: { name: true, image: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!set)
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        아직 확정된 자율연구 모둠이 없습니다.
      </div>
    );

  const isAdmin = viewer.mode === "member" && viewer.isAdmin;
  const myGroupId =
    viewer.mode === "member"
      ? (set.groups.find((g) => g.members.some((m) => m.userId === viewer.userId))?.id ?? null)
      : null;
  // 학습자는 내 모둠 카드를 맨 앞에 표시
  const groups = myGroupId
    ? [
        set.groups.find((g) => g.id === myGroupId)!,
        ...set.groups.filter((g) => g.id !== myGroupId),
      ]
    : set.groups;

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const editable = isAdmin || g.id === myGroupId;
        const mine = g.id === myGroupId && !isAdmin;

        return (
          <div
            key={g.id}
            className={`overflow-hidden rounded-[14px] border bg-white ${
              mine ? "border-accent-border" : "border-line"
            }`}
          >
            <div className="flex flex-col gap-1.5 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[15px] font-semibold text-stone-800">
                  연구 모둠 {g.index + 1}
                </span>
                {mine && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-accent">
                    내 모둠
                  </span>
                )}
                {editable ? (
                  <GroupTopicEditor
                    groupId={g.id}
                    topic={g.customTopic ?? topicTitleOf(g.topic.markdown)}
                    isCustom={!!g.customTopic}
                  />
                ) : (
                  <span className="text-[12px] text-stone-400">
                    주제:{" "}
                    <b className="font-medium text-stone-600 [overflow-wrap:anywhere]">
                      {g.customTopic ?? topicTitleOf(g.topic.markdown)}
                    </b>
                  </span>
                )}
              </div>
              <span className="text-[11.5px] text-stone-400">
                {g.members.map((m) => m.user.name.split("/")[0].trim()).join(" · ")}
              </span>
            </div>

            {/* 발표 자료 링크 */}
            <div className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-4">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-600">
                <LinkIcon size={13} />
                발표 자료
              </span>
              {g.showcaseLinks.length === 0 && (
                <span className="text-[12px] text-stone-400">아직 등록된 발표 자료가 없습니다</span>
              )}
              {g.showcaseLinks.map((l) => (
                <span key={l.id} className="flex items-center gap-2">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-accent hover:underline [overflow-wrap:anywhere]"
                  >
                    {l.title} ↗
                  </a>
                  {editable && <ShowcaseDeleteButton kind="link" id={l.id} />}
                </span>
              ))}
              {editable && <AddLinkForm groupId={g.id} />}
            </div>

            {/* 게스트 질문 */}
            <div className="flex flex-col gap-3.5 border-t border-line-soft bg-paper/60 px-5 py-4">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-600">
                <QnaIcon size={13} />
                게스트 질문 {g.guestQuestions.length > 0 && `${g.guestQuestions.length}`}
              </span>

              {g.guestQuestions.length === 0 && (
                <span className="text-[12px] text-stone-400">아직 게스트 질문이 없습니다</span>
              )}

              {g.guestQuestions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                    <b className="text-[11.5px] font-semibold text-stone-600">{q.guestName}</b>
                    <span className="rounded-full bg-line-soft px-1.5 py-px text-[9.5px] font-semibold text-stone-500">
                      게스트
                    </span>
                    {formatDateTime(q.createdAt)}
                    {isAdmin && (
                      <>
                        <GuestQuestionEditButton questionId={q.id} content={q.content} />
                        <ShowcaseDeleteButton kind="question" id={q.id} />
                      </>
                    )}
                  </span>
                  <div className="text-[12.5px] leading-relaxed [overflow-wrap:anywhere] text-stone-800">
                    {q.content}
                  </div>

                  {q.answers.map((a) => (
                    <div key={a.id} className="mt-1 flex gap-2 border-l-2 border-accent/30 pl-3">
                      <UserAvatar name={a.user.name} image={a.user.image} size={20} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-baseline gap-1.5 text-[10.5px] text-stone-400">
                          <b className="text-[11px] font-semibold text-stone-600">
                            {a.user.name.split("/")[0].trim()}
                          </b>
                          {formatDateTime(a.createdAt)}
                          {viewer.mode === "member" &&
                            (isAdmin || a.userId === viewer.userId) && (
                              <ShowcaseDeleteButton kind="answer" id={a.id} />
                            )}
                        </span>
                        <div className="text-[12.5px] leading-relaxed [overflow-wrap:anywhere] text-stone-800">
                          {a.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {editable && (
                    <div className="mt-1">
                      <AnswerComposer questionId={q.id} />
                    </div>
                  )}
                </div>
              ))}

              {viewer.mode === "guest" && <GuestQuestionForm token={viewer.token} groupId={g.id} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
