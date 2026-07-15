import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Markdown } from "@/lib/md";
import { initialOf, topicTitleOf } from "@/lib/utils";
import { TopicLikeButton, CommentsSection } from "./interactions";

// 주제 상세 (전체 페이지·모달 공용). 모달에서는 목록 이동에 replace를 써서
// 뒤로 가기 한 번에 원래 화면으로 돌아간다.
export async function TopicDetailView({ id, inModal = false }: { id: string; inModal?: boolean }) {
  const user = await requireUser();

  const [topic, allTopics] = await Promise.all([
    prisma.topic.findUnique({
      where: { id },
      include: {
        user: true,
        likes: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    // 우측 목록: 카드 뷰와 동일한 순서
    prisma.topic.findMany({
      where: { markdown: { not: "" } },
      include: { user: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!topic) notFound();

  const liked = topic.likes.some((l) => l.userId === user.id);
  // 작성자가 키워드 지도에서 하트로 추가한 키워드
  const heartedKeywords = (
    await prisma.keywordLike.findMany({ where: { userId: topic.userId } })
  )
    .map((kl) => kl.keyword)
    .filter((k) => !topic.keywords.includes(k));

  return (
    <div className="flex flex-col gap-4">
      {/* 타이틀 — 모달에서는 닫기 버튼과 겹치지 않게 우측 여백 확보 */}
      <span className={`font-display text-[19px] text-stone-800 ${inModal ? "pr-10" : ""}`}>
        {topic.user.name.split("/")[0].trim()}의 연구 주제
      </span>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-line text-[13px] font-semibold text-stone-600">
                {initialOf(topic.user.name)}
              </div>
              <span className="text-[13.5px] font-semibold">{topic.user.name}</span>
            </div>
            <TopicLikeButton topicId={topic.id} liked={liked} count={topic.likes.length} />
          </div>
          <div className="text-[13.5px] leading-[1.75] text-stone-700">
            <Markdown md={topic.markdown} />
          </div>
          {(topic.keywords.length > 0 || heartedKeywords.length > 0) && (
            <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
              {topic.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-line-soft px-[11px] py-1 text-[11.5px] font-medium text-stone-600"
                >
                  #{k}
                </span>
              ))}
              {heartedKeywords.map((k) => (
                <span
                  key={`liked-${k}`}
                  className="rounded-full bg-bad-soft px-[11px] py-1 text-[11.5px] font-medium text-bad"
                >
                  ♥ #{k}
                </span>
              ))}
            </div>
          )}
        </div>

        <CommentsSection
          topicId={topic.id}
          myName={user.name ?? ""}
          comments={topic.comments.map((c) => ({ id: c.id, name: c.user.name, text: c.text }))}
        />
      </div>

      {/* 우측 주제 목록 — 목록으로 돌아가지 않고 바로 이동 */}
      <aside
        className={`sticky hidden flex-col overflow-hidden rounded-xl border border-line bg-white lg:flex ${
          inModal ? "top-0 max-h-[70vh]" : "top-20 max-h-[calc(100vh-120px)]"
        }`}
      >
        <span className="font-display border-b border-line-soft px-4 py-3 text-[12.5px] text-stone-600">
          동료 주제 목록 <span className="font-normal text-stone-400">· {allTopics.length}</span>
        </span>
        <div className="flex flex-col overflow-y-auto">
          {allTopics.map((t) => {
            const active = t.id === topic.id;
            return (
              <Link
                key={t.id}
                href={`/topics/${t.id}`}
                replace={inModal}
                className={`flex flex-col gap-0.5 border-b border-[#f7f6f4] px-4 py-2.5 last:border-b-0 ${
                  active ? "bg-accent-tint" : "hover:bg-paper"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400">
                  {t.user.name.split("/")[0].trim()}
                  {t.userId === user.id && (
                    <span className="rounded-[4px] bg-accent-soft px-1 py-px text-[9px] font-bold text-accent">
                      내 주제
                    </span>
                  )}
                </span>
                <span
                  className={`line-clamp-2 text-[12px] leading-snug ${
                    active ? "font-semibold text-accent" : "font-medium text-stone-700"
                  }`}
                >
                  {topicTitleOf(t.markdown)}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
      </div>
    </div>
  );
}
