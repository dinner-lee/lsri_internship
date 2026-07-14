import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Markdown } from "@/lib/md";
import { initialOf } from "@/lib/utils";
import { TopicLikeButton, CommentsSection } from "./interactions";

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      user: true,
      likes: true,
      comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!topic) notFound();

  const liked = topic.likes.some((l) => l.userId === user.id);
  // 작성자가 키워드 지도에서 하트로 추가한 키워드
  const heartedKeywords = (
    await prisma.keywordLike.findMany({ where: { userId: topic.userId } })
  )
    .map((kl) => kl.keyword)
    .filter((k) => !topic.keywords.includes(k));

  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <Link href="/topics" className="text-xs text-stone-400 hover:text-stone-600">
        ← 목록으로
      </Link>

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
  );
}
