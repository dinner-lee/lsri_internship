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
  GuestAnswerComposer,
} from "@/components/showcase-client";

type Viewer =
  | { mode: "member"; userId: string; isAdmin: boolean }
  | { mode: "guest"; token: string };

// 자료 링크의 서비스별 아이콘 (캔바 / 구글 슬라이드)
const CANVA_ICON =
  "https://ads.apple.com/adsdam/app-store/kr/ko_kr/images/success-stories/canva/lp/icon_lms/ss_canva_chicklet_LP_160px_LMS_2x.png";
const GOOGLE_SLIDES_ICON =
  "https://play-lh.googleusercontent.com/xqxFEBjrkpXc_RtE9sPfOEftQmPS0KhFg3IHWyaYVS243dIEbQArz1xOhPgfF_s1NCHpVNBPeb5ykWU_LqyUDw";

function serviceIconOf(url: string): { src: string; alt: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host === "canva.com" || host.endsWith(".canva.com"))
      return { src: CANVA_ICON, alt: "Canva" };
    if (host === "docs.google.com" && u.pathname.startsWith("/presentation"))
      return { src: GOOGLE_SLIDES_ICON, alt: "Google Slides" };
  } catch {
    // 잘못된 URL이면 아이콘 없이 표시
  }
  return null;
}

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
            {viewer.mode === "guest" ? (
              /* 게스트: 모둠 주제를 크게 보여주는 가로형 배너 */
              <div className="flex flex-col gap-2 bg-accent-soft/60 px-6 py-5">
                <span className="font-display text-[12px] font-semibold tracking-wide text-accent">
                  연구 모둠 {g.index + 1}
                </span>
                <span className="font-display text-[21px] leading-snug font-bold tracking-tight [overflow-wrap:anywhere] text-stone-800">
                  {g.customTopic ?? topicTitleOf(g.topic.markdown)}
                </span>
                <span className="text-[12px] text-stone-500">
                  {g.members.map((m) => m.user.name.split("/")[0].trim()).join(" · ")}
                </span>
              </div>
            ) : (
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
            )}

            {/* 발표 자료 링크 */}
            <div className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-4">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-600">
                <LinkIcon size={13} />
                발표 자료
              </span>
              {g.showcaseLinks.length === 0 && (
                <span className="text-[12px] text-stone-400">아직 등록된 발표 자료가 없습니다</span>
              )}
              {g.showcaseLinks.map((l) => {
                const icon = serviceIconOf(l.url);
                return (
                  <span key={l.id} className="flex items-center gap-2">
                    {icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={icon.src}
                        alt={icon.alt}
                        width={18}
                        height={18}
                        className="flex-none rounded-[4px] object-cover"
                        style={{ width: 18, height: 18 }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex-none text-stone-400">
                        <LinkIcon size={14} />
                      </span>
                    )}
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
                );
              })}
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

              {g.guestQuestions.map((q) => {
                const topAnswers = q.answers.filter((a) => a.parentId === null);
                const repliesOf = (id: string) => q.answers.filter((a) => a.parentId === id);
                // 스레드 답글 입력 — 게스트는 저장된 이름으로, 모둠원·관리자는 계정으로
                const replyComposer = (parentId: string) =>
                  viewer.mode === "guest" ? (
                    <GuestAnswerComposer
                      token={viewer.token}
                      questionId={q.id}
                      parentId={parentId}
                    />
                  ) : editable ? (
                    <AnswerComposer
                      questionId={q.id}
                      parentId={parentId}
                      placeholder="답글을 남겨보세요"
                    />
                  ) : null;
                const canReply = viewer.mode === "guest" || editable;

                const answerBlock = (a: (typeof q.answers)[number], indent: boolean) => {
                  const name = a.user ? a.user.name.split("/")[0].trim() : (a.guestName ?? "게스트");
                  const canDelete =
                    viewer.mode === "member" &&
                    (a.userId ? isAdmin || a.userId === viewer.userId : isAdmin);
                  return (
                    <div
                      key={a.id}
                      className={`flex gap-2 ${indent ? "mt-1.5 border-l-2 border-line pl-3" : "mt-1 border-l-2 border-accent/30 pl-3"}`}
                    >
                      <UserAvatar name={name} image={a.user?.image ?? null} size={20} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-1.5 text-[10.5px] text-stone-400">
                          <b className="text-[11px] font-semibold text-stone-600">{name}</b>
                          {!a.user && (
                            <span className="rounded-full bg-line-soft px-1.5 py-px text-[9px] font-semibold text-stone-500">
                              게스트
                            </span>
                          )}
                          {formatDateTime(a.createdAt)}
                          {canDelete && <ShowcaseDeleteButton kind="answer" id={a.id} />}
                        </span>
                        <div className="text-[12.5px] leading-relaxed [overflow-wrap:anywhere] text-stone-800">
                          {a.content}
                        </div>

                        {!indent && repliesOf(a.id).map((r) => answerBlock(r, true))}

                        {canReply && (
                          <details className="mt-0.5">
                            <summary className="w-fit cursor-pointer list-none text-[11px] text-stone-400 hover:text-accent">
                              답글 달기
                            </summary>
                            <div className="mt-1.5">{replyComposer(a.id)}</div>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <div key={q.id} className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                      <UserAvatar name={q.guestName} image={null} size={24} />
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

                    {topAnswers.map((a) => answerBlock(a, false))}

                    {viewer.mode === "guest" ? (
                      <div className="mt-1">
                        <GuestAnswerComposer
                          token={viewer.token}
                          questionId={q.id}
                          placeholder="답글을 남겨보세요"
                        />
                      </div>
                    ) : (
                      editable && (
                        <div className="mt-1">
                          <AnswerComposer questionId={q.id} />
                        </div>
                      )
                    )}
                  </div>
                );
              })}

              {viewer.mode === "guest" && <GuestQuestionForm token={viewer.token} groupId={g.id} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
