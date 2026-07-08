"use client";

import { useState, useTransition } from "react";
import { toggleTopicLikeAction, addCommentAction } from "@/lib/actions/topics";

export function TopicLikeButton({
  topicId,
  liked,
  count,
}: {
  topicId: string;
  liked: boolean;
  count: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => toggleTopicLikeAction(topicId))}
      disabled={pending}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-[15px] py-[7px] text-[12.5px] font-semibold ${
        liked ? "border-bad-border bg-bad-soft text-bad" : "border-line bg-white text-stone-600"
      }`}
    >
      {liked ? "♥" : "♡"} 좋아요 {count}
    </button>
  );
}

export function CommentForm({ topicId }: { topicId: string }) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      await addCommentAction(topicId, text);
      setDraft("");
    });
  };

  return (
    <div className="flex gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder="댓글을 남겨보세요"
        className="flex-1 rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending}
        className="cursor-pointer rounded-[10px] bg-stone-900 px-[18px] text-[12.5px] font-semibold text-white disabled:opacity-60"
      >
        등록
      </button>
    </div>
  );
}
