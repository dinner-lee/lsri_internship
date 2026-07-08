"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleTopicLikeAction, addCommentAction } from "@/lib/actions/topics";
import { initialOf } from "@/lib/utils";

export function TopicLikeButton({
  topicId,
  liked,
  count,
}: {
  topicId: string;
  liked: boolean;
  count: number;
}) {
  const [, startTransition] = useTransition();
  // 낙관적 갱신: 클릭 즉시 하트/카운트 변경
  const [opt, toggle] = useOptimistic({ liked, count }, (s) => ({
    liked: !s.liked,
    count: s.count + (s.liked ? -1 : 1),
  }));

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          toggle(undefined);
          await toggleTopicLikeAction(topicId);
        })
      }
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-[15px] py-[7px] text-[12.5px] font-semibold ${
        opt.liked ? "border-bad-border bg-bad-soft text-bad" : "border-line bg-white text-stone-600"
      }`}
    >
      {opt.liked ? "♥" : "♡"} 좋아요 {opt.count}
    </button>
  );
}

export interface CommentItem {
  id: string;
  name: string;
  text: string;
}

export function CommentsSection({
  topicId,
  comments,
  myName,
}: {
  topicId: string;
  comments: CommentItem[];
  myName: string;
}) {
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  // 낙관적 갱신: 등록 즉시 목록에 추가
  const [optComments, appendComment] = useOptimistic(comments, (state, text: string) => [
    ...state,
    { id: `optimistic-${state.length}`, name: myName, text },
  ]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(async () => {
      appendComment(text);
      await addCommentAction(topicId, text);
    });
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-7 py-6">
      <div className="font-display text-[13.5px] text-stone-600">
        댓글 {optComments.length}
      </div>
      {optComments.map((c) => (
        <div key={c.id} className="flex gap-2.5">
          <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-line text-[11px] font-semibold text-stone-600">
            {initialOf(c.name)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">{c.name}</span>
            <span className="text-[13px] leading-relaxed text-stone-700">{c.text}</span>
          </div>
        </div>
      ))}
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
          className="cursor-pointer rounded-[10px] bg-stone-900 px-[18px] text-[12.5px] font-semibold text-white"
        >
          등록
        </button>
      </div>
    </div>
  );
}
