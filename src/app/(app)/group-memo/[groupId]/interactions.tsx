"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleMemoLikeAction, addMemoCommentAction } from "@/lib/actions/group-memo";
import { initialOf } from "@/lib/utils";

export function MemoLikeButton({
  groupId,
  liked,
  count,
}: {
  groupId: string;
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
          await toggleMemoLikeAction(groupId);
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

export interface MemoCommentItem {
  id: string;
  name: string;
  text: string;
}

export function MemoComments({
  groupId,
  comments,
  myName,
}: {
  groupId: string;
  comments: MemoCommentItem[];
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
      await addMemoCommentAction(groupId, text);
    });
  };

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line-soft px-6 py-3.5">
        <span className="font-display text-[14px] text-stone-700">댓글</span>
        {optComments.length > 0 && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
            {optComments.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        {optComments.length === 0 && (
          <div className="py-3 text-center text-[12.5px] text-stone-300">
            아직 댓글이 없습니다 — 이 모둠의 메모에 첫 댓글을 남겨보세요
          </div>
        )}
        {optComments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-[11.5px] font-bold text-accent">
              {initialOf(c.name)}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[11.5px] font-semibold text-stone-500">{c.name}</span>
              <div className="w-fit rounded-2xl rounded-tl-sm bg-line-soft px-4 py-2.5 text-[13px] leading-relaxed break-words text-stone-800">
                {c.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line-soft bg-paper px-6 py-3.5">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            placeholder="이 모둠의 메모에 댓글을 남겨보세요"
            className="h-10 flex-1 rounded-full border border-line bg-white px-4.5 text-[13px] text-stone-800"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="댓글 등록"
            className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-accent text-[16px] text-white transition-colors hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
