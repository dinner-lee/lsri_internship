"use client";

import { useState, useTransition, useOptimistic } from "react";
import {
  createQnaQuestionAction,
  deleteQnaQuestionAction,
  toggleQnaLikeAction,
  addQnaCommentAction,
  deleteQnaCommentAction,
} from "@/lib/actions/qna";

// 새 질문 작성 폼
export function NewQuestionForm() {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(() => createQnaQuestionAction(text));
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-white px-5 py-4 shadow-[0_18px_44px_-26px_rgba(30,50,90,.32),0_1px_3px_rgba(30,50,90,.04)]">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="궁금한 점을 질문해 보세요"
        rows={2}
        className="resize-y rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        className="font-display self-end rounded-[9px] bg-[linear-gradient(135deg,#2a63b4,#003E81)] px-5 py-2 text-[13px] text-white shadow-[0_8px_18px_-8px_rgba(0,62,129,.5)] hover:brightness-115 disabled:cursor-default disabled:bg-line disabled:text-stone-400"
      >
        질문 올리기
      </button>
    </div>
  );
}

// 질문 좋아요 (낙관적 갱신)
export function QnaLikeButton({
  questionId,
  liked,
  count,
}: {
  questionId: string;
  liked: boolean;
  count: number;
}) {
  const [, startTransition] = useTransition();
  const [opt, toggle] = useOptimistic({ liked, count }, (s) => ({
    liked: !s.liked,
    count: s.count + (s.liked ? -1 : 1),
  }));

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          toggle(undefined);
          await toggleQnaLikeAction(questionId);
        })
      }
      className={`flex cursor-pointer items-center gap-1 text-[11.5px] font-semibold ${
        opt.liked ? "text-bad" : "text-stone-400 hover:text-bad"
      }`}
    >
      {opt.liked ? "♥" : "♡"} {opt.count}
    </button>
  );
}

// 질문/댓글 삭제 (본인·관리자에게만 렌더링됨)
export function QnaDeleteButton({ kind, id }: { kind: "question" | "comment"; id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(kind === "question" ? "이 질문을 삭제할까요?" : "이 댓글을 삭제할까요?"))
          return;
        startTransition(() =>
          kind === "question" ? deleteQnaQuestionAction(id) : deleteQnaCommentAction(id)
        );
      }}
      className="cursor-pointer text-[11px] text-stone-300 hover:text-bad disabled:opacity-50"
    >
      삭제
    </button>
  );
}

// 댓글/답글 입력 (parentId가 있으면 답글)
export function CommentComposer({
  questionId,
  parentId = null,
  placeholder,
}: {
  questionId: string;
  parentId?: string | null;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(() => addQnaCommentAction(questionId, text, parentId));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder={placeholder}
        className="h-9 flex-1 rounded-full border border-line bg-white px-4 text-[12.5px] text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        aria-label="등록"
        className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-accent text-[15px] text-white hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
      >
        ↑
      </button>
    </div>
  );
}
