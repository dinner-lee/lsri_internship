import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Markdown } from "@/lib/md";
import { initialOf } from "@/lib/utils";
import { TopicLikeButton, CommentForm } from "./interactions";

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
        {topic.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
            {topic.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-line-soft px-[11px] py-1 text-[11.5px] font-medium text-stone-600"
              >
                #{k}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-7 py-6">
        <div className="font-display text-[13.5px] text-stone-600">
          댓글 {topic.comments.length}
        </div>
        {topic.comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-line text-[11px] font-semibold text-stone-600">
              {initialOf(c.user.name)}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">{c.user.name}</span>
              <span className="text-[13px] leading-relaxed text-stone-700">{c.text}</span>
            </div>
          </div>
        ))}
        <CommentForm topicId={topic.id} />
      </div>
    </div>
  );
}
