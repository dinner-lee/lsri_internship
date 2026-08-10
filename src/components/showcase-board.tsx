import { prisma } from "@/lib/prisma";
import { formatDateTime, topicTitleOf } from "@/lib/utils";
import { UserAvatar } from "@/components/user-menu";
import {
  GroupTopicEditor,
  AddLinkForm,
  ShowcaseDeleteButton,
  GuestQuestionEditButton,
  AnswerComposer,
  ShowcaseCommentComposer,
} from "@/components/showcase-client";

// 자료 링크의 서비스별 아이콘 (캔바 / 구글 슬라이드)
const CANVA_ICON =
  "https://ads.apple.com/adsdam/app-store/kr/ko_kr/images/success-stories/canva/lp/icon_lms/ss_canva_chicklet_LP_160px_LMS_2x.png";
const GOOGLE_SLIDES_ICON =
  "https://play-lh.googleusercontent.com/xqxFEBjrkpXc_RtE9sPfOEftQmPS0KhFg3IHWyaYVS243dIEbQArz1xOhPgfF_s1NCHpVNBPeb5ykWU_LqyUDw";

export function serviceIconOf(url: string): { src: string; alt: string } | null {
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

const initialOf = (n: string) => (n || "게").trim().charAt(0);

// 작성자 배지 — 해당 모둠원이면 '발표자', 관리자면 '관리자'
function badgeOf(userId: string | null, role: string | undefined, memberIds: Set<string>) {
  if (userId && memberIds.has(userId)) return "발표자";
  if (role === "ADMIN") return "관리자";
  return null;
}

// 결과보고회 모둠 카드 보드 — 학습자·관리자용 (/showcase, 게스트 화면과 같은 디자인 언어)
export async function ShowcaseBoard({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const set = await prisma.researchGroupSet.findFirst({
    where: { confirmedAt: { not: null } },
    orderBy: { confirmedAt: "desc" },
    include: {
      groups: {
        orderBy: { index: "asc" },
        include: {
          topic: { select: { markdown: true } },
          members: { include: { user: { select: { name: true } } } },
          showcaseLinks: { orderBy: { createdAt: "asc" } },
          guestQuestions: {
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { name: true, image: true, role: true } },
              _count: { select: { likes: true } },
              answers: {
                orderBy: { createdAt: "asc" },
                include: { user: { select: { name: true, role: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!set)
    return (
      <div className="rounded-[20px] bg-white p-8 text-center text-[13.5px] text-[#8b96a8] shadow-[0_18px_44px_-26px_rgba(30,50,90,.32)]">
        아직 확정된 자율연구 모둠이 없습니다.
      </div>
    );

  const myGroupId =
    set.groups.find((g) => g.members.some((m) => m.userId === userId))?.id ?? null;
  const numbered = set.groups.map((g, i) => ({ g, no: String(i + 1).padStart(2, "0") }));
  // 학습자는 내 모둠 카드를 맨 앞에 표시
  const ordered = myGroupId
    ? [...numbered.filter((x) => x.g.id === myGroupId), ...numbered.filter((x) => x.g.id !== myGroupId)]
    : numbered;

  return (
    <div className="flex flex-col gap-[18px]">
      {ordered.map(({ g, no }) => {
        const editable = isAdmin || g.id === myGroupId;
        const mine = g.id === myGroupId && !isAdmin;
        const title = g.customTopic ?? topicTitleOf(g.topic.markdown);
        const memberIds = new Set(g.members.map((m) => m.userId));

        return (
          <section
            key={g.id}
            className="overflow-hidden rounded-[20px] bg-white shadow-[0_18px_44px_-26px_rgba(30,50,90,.32),0_1px_3px_rgba(30,50,90,.04)]"
          >
            {/* 모둠 헤더 */}
            <div className="flex gap-4 bg-[linear-gradient(135deg,#f2f6fc,#eef2f9_60%,#f0f5f2)] px-5 pt-6 pb-5 sm:gap-[18px] sm:px-7">
              <span className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.06em] text-[#003E81] tabular-nums sm:text-[30px]">
                {no}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-nexon m-0 text-[17px] leading-[1.5] font-normal tracking-[-0.03em] [overflow-wrap:anywhere] text-[#12233c] sm:text-[19px]">
                    {title}
                  </h2>
                  {mine && (
                    <span className="rounded-full bg-[#eaf0f8] px-2.5 py-[3px] text-[10.5px] font-bold text-[#003E81]">
                      내 모둠
                    </span>
                  )}
                  {editable && <GroupTopicEditor groupId={g.id} topic={title} isCustom={!!g.customTopic} compact />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full bg-white px-[11px] py-1 text-[12.5px] font-medium text-[#3d4d64] shadow-[inset_0_0_0_1px_#c9d5e6]"
                    >
                      {m.user.name.split("/")[0].trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 발표 자료 */}
            <div className="flex flex-col gap-2.5 border-b border-[#edf0f5] px-5 py-4 sm:px-7">
              <span className="text-[11.5px] font-bold tracking-[0.05em] text-[#8b96a8]">
                발표 자료
              </span>
              {g.showcaseLinks.length === 0 && !editable && (
                <span className="py-1 text-[13px] text-[#8b96a8]">
                  아직 등록된 발표 자료가 없습니다.
                </span>
              )}
              {g.showcaseLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {g.showcaseLinks.map((l) => {
                    const icon = serviceIconOf(l.url);
                    return (
                      <span key={l.id} className="inline-flex items-center gap-1.5">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-[9px] border border-[#e4e9f0] bg-white py-2 pr-[13px] pl-[9px] hover:border-[#003E81] hover:bg-[#f8fafd]"
                        >
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
                            <span className="rounded-[4px] bg-[#003E81] px-1.5 py-[3px] text-[9.5px] font-extrabold tracking-[0.04em] text-white">
                              LINK
                            </span>
                          )}
                          <span className="text-[13px] font-semibold text-[#12233c]">
                            {l.title}
                          </span>
                        </a>
                        {editable && <ShowcaseDeleteButton kind="link" id={l.id} />}
                      </span>
                    );
                  })}
                </div>
              )}
              {editable && <AddLinkForm groupId={g.id} />}
            </div>

            {/* 통합 질문·댓글 — 게스트 질문과 학습자·관리자 댓글을 한 곳에 표시 */}
            <div className="flex flex-col gap-[13px] px-5 pt-4 pb-[22px] sm:px-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] font-bold tracking-[0.05em] text-[#8b96a8]">
                  질문·댓글
                </span>
                <span className="rounded-full bg-[#f4f6f9] px-[9px] py-[2px] text-[11.5px] font-bold text-[#3d4d64] tabular-nums">
                  {g.guestQuestions.length}
                </span>
              </div>

              {g.guestQuestions.length === 0 && (
                <span className="text-[13px] text-[#8b96a8]">
                  아직 올라온 질문이나 댓글이 없습니다.
                </span>
              )}

              <div className="flex flex-col gap-[9px]">
                {g.guestQuestions.map((q) => {
                  const isGuestPost = !q.user;
                  const authorName = q.user
                    ? q.user.name.split("/")[0].trim()
                    : (q.guestName ?? "게스트");
                  const postBadge = badgeOf(q.userId, q.user?.role, memberIds);
                  const answered =
                    isGuestPost &&
                    q.answers.some((a) => badgeOf(a.userId, a.user?.role, memberIds));
                  const canDeletePost = isAdmin || (!!q.userId && q.userId === userId);

                  return (
                    <div
                      key={q.id}
                      className="flex gap-3 rounded-xl bg-[#fafbfc] p-[14px] shadow-[inset_0_0_0_1px_#eef1f5]"
                    >
                      {q.user ? (
                        <UserAvatar name={q.user.name} image={q.user.image} size={31} />
                      ) : (
                        <div className="flex h-[31px] w-[31px] flex-none items-center justify-center rounded-full bg-[#f0f2f7] text-[12px] font-bold text-[#3d4d64]">
                          {initialOf(authorName)}
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-[#12233c]">
                            {authorName}
                          </span>
                          {isGuestPost && (
                            <span className="rounded-full bg-[#f0f2f7] px-2 py-px text-[9.5px] font-bold text-[#5d6b80]">
                              게스트
                            </span>
                          )}
                          {postBadge && (
                            <span className="rounded-[4px] bg-[#003E81] px-[7px] py-[2px] text-[10px] font-extrabold text-white">
                              {postBadge}
                            </span>
                          )}
                          <span className="text-[11.5px] text-[#8b96a8]">
                            {formatDateTime(q.createdAt)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[2px] text-[11px] font-bold tabular-nums ${
                              q._count.likes > 0
                                ? "bg-[#eaf0f8] text-[#003E81]"
                                : "bg-[#f4f6f9] text-[#9aa3b2]"
                            }`}
                          >
                            <span className="text-[10px]">▲</span>공감 {q._count.likes}
                          </span>
                          {answered && (
                            <span className="rounded-[4px] bg-[#f7f1e4] px-2 py-[2px] text-[10.5px] font-bold text-[#8a6a2f]">
                              답변 완료
                            </span>
                          )}
                          {isAdmin && isGuestPost && (
                            <GuestQuestionEditButton questionId={q.id} content={q.content} />
                          )}
                          {canDeletePost && <ShowcaseDeleteButton kind="question" id={q.id} />}
                        </div>
                        <p className="m-0 text-[14px] leading-[1.7] [overflow-wrap:anywhere] text-[#2c3a4f]">
                          {q.content}
                        </p>

                        {q.answers.length > 0 && (
                          <div className="mt-[2px] flex flex-col gap-[7px] border-l-2 border-[#e4e9f0] pl-3">
                            {q.answers.map((a) => {
                              const replyBadge = badgeOf(a.userId, a.user?.role, memberIds);
                              const name = a.user
                                ? a.user.name.split("/")[0].trim()
                                : (a.guestName ?? "게스트");
                              const canDelete = a.userId
                                ? isAdmin || a.userId === userId
                                : isAdmin;
                              return (
                                <div
                                  key={a.id}
                                  className={`flex flex-col gap-[3px] rounded-[9px] px-3 py-[9px] ${replyBadge ? "bg-[#f0f5fb]" : "bg-[#f7f8fa]"}`}
                                >
                                  <div className="flex flex-wrap items-center gap-[7px]">
                                    <span
                                      className={`text-[12px] font-bold ${replyBadge ? "text-[#003E81]" : "text-[#12233c]"}`}
                                    >
                                      {name}
                                    </span>
                                    {!a.user && (
                                      <span className="rounded-full bg-[#f0f2f7] px-2 py-px text-[9px] font-bold text-[#5d6b80]">
                                        게스트
                                      </span>
                                    )}
                                    {replyBadge && (
                                      <span className="rounded-[4px] bg-[#003E81] px-[7px] py-[2px] text-[10px] font-extrabold text-white">
                                        {replyBadge}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-[#8b96a8]">
                                      {formatDateTime(a.createdAt)}
                                    </span>
                                    {canDelete && <ShowcaseDeleteButton kind="answer" id={a.id} />}
                                  </div>
                                  <p className="m-0 text-[13px] leading-[1.65] [overflow-wrap:anywhere] text-[#3d4d64]">
                                    {a.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <details className="mt-0.5">
                          <summary className="w-fit cursor-pointer list-none text-[11px] text-[#8b96a8] hover:text-[#003E81]">
                            답글 달기
                          </summary>
                          <div className="mt-1.5">
                            <AnswerComposer questionId={q.id} placeholder="답글을 남겨보세요" />
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
              </div>

              <ShowcaseCommentComposer groupId={g.id} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
