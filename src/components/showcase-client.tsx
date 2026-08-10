"use client";

import { useState, useTransition } from "react";
import {
  setGroupTopicAction,
  addShowcaseLinkAction,
  deleteShowcaseLinkAction,
  updateGuestQuestionAction,
  answerGuestQuestionAction,
  addShowcaseCommentAction,
  deleteGuestAnswerAction,
  deleteGuestQuestionAction,
  issueGuestTokenAction,
  disableGuestTokenAction,
} from "@/lib/actions/showcase";

// 모둠 연구 주제 인라인 편집 (모둠원·관리자) — 비우고 저장하면 앵커 주제로 되돌아감
export function GroupTopicEditor({
  groupId,
  topic,
  isCustom,
  compact = false,
}: {
  groupId: string;
  topic: string;
  isCustom: boolean;
  compact?: boolean; // true면 비편집 상태에서 '주제 수정' 버튼만 표시 (제목은 바깥에서 렌더링)
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    const open = () => {
      setDraft(topic);
      setEditing(true);
    };
    if (compact)
      return (
        <button
          onClick={open}
          className="cursor-pointer rounded-full px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-[#8b96a8] hover:bg-[#eaf0f8] hover:text-[#003E81]"
        >
          주제 수정
        </button>
      );
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] text-stone-400">
        주제: <b className="font-medium text-stone-600 [overflow-wrap:anywhere]">{topic}</b>
        <button onClick={open} className="cursor-pointer text-[11px] text-stone-300 hover:text-accent">
          수정
        </button>
      </span>
    );
  }

  return (
    <span className="flex w-full items-center gap-1.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            startTransition(async () => {
              await setGroupTopicAction(groupId, draft);
              setEditing(false);
            });
          }
        }}
        autoFocus
        placeholder="연구 주제 입력"
        className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-white px-2.5 text-[12px] text-stone-800"
      />
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setGroupTopicAction(groupId, draft);
            setEditing(false);
          })
        }
        className="cursor-pointer text-[11px] font-semibold text-accent disabled:opacity-50"
      >
        저장
      </button>
      {isCustom && (
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setGroupTopicAction(groupId, "");
              setEditing(false);
            })
          }
          className="cursor-pointer whitespace-nowrap text-[11px] text-stone-400 hover:text-stone-600 disabled:opacity-50"
        >
          원래대로
        </button>
      )}
      <button
        onClick={() => setEditing(false)}
        className="cursor-pointer text-[11px] text-stone-400"
      >
        취소
      </button>
    </span>
  );
}

// 발표 자료 링크 추가 폼 (모둠원·관리자)
export function AddLinkForm({ groupId }: { groupId: string }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;
    setTitle("");
    setUrl("");
    startTransition(() => addShowcaseLinkAction(groupId, t, u));
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="자료 이름 (예: 발표 슬라이드)"
        className="h-9 rounded-[9px] border-[1.5px] border-transparent bg-[#f4f6f9] px-3.5 text-[12.5px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white sm:w-52"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder="링크 주소 (https://...)"
        className="h-9 flex-1 rounded-[9px] border-[1.5px] border-transparent bg-[#f4f6f9] px-3.5 text-[12.5px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white"
      />
      <button
        onClick={submit}
        disabled={pending || !title.trim() || !url.trim()}
        className="h-9 rounded-[9px] bg-[#003E81] px-4 text-[12.5px] font-bold text-white hover:brightness-115 disabled:cursor-default disabled:bg-[#e7ebf1] disabled:text-[#9aa3b2]"
      >
        추가
      </button>
    </div>
  );
}

const DELETE_CONFIRM = {
  link: "이 발표 자료 링크를 삭제할까요?",
  question: "이 질문·댓글을 삭제할까요? 달린 답글도 함께 삭제됩니다.",
  answer: "이 답글을 삭제할까요?",
} as const;

export function ShowcaseDeleteButton({
  kind,
  id,
}: {
  kind: "link" | "question" | "answer";
  id: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(DELETE_CONFIRM[kind])) return;
        startTransition(() =>
          kind === "link"
            ? deleteShowcaseLinkAction(id)
            : kind === "question"
              ? deleteGuestQuestionAction(id)
              : deleteGuestAnswerAction(id)
        );
      }}
      className="cursor-pointer text-[11px] text-stone-300 hover:text-bad disabled:opacity-50"
    >
      삭제
    </button>
  );
}

// 게스트 질문 스레드 답변·답글 입력 (모둠원·관리자)
export function AnswerComposer({
  questionId,
  parentId = null,
  placeholder = "답변을 남겨보세요",
}: {
  questionId: string;
  parentId?: string | null;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(() => answerGuestQuestionAction(questionId, text, parentId));
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
        className="h-[38px] min-w-0 flex-1 rounded-lg border-[1.5px] border-transparent bg-[#f4f6f9] px-[13px] text-[13px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        className={`rounded-lg px-4 py-2 text-[12.5px] font-bold ${
          draft.trim() && !pending
            ? "cursor-pointer bg-[#003E81] text-white"
            : "cursor-default bg-[#e7ebf1] text-[#9aa3b2]"
        }`}
      >
        등록
      </button>
    </div>
  );
}

// 통합 질문·댓글 작성 (학습자·관리자 공용 — 어느 모둠에나 가능)
export function ShowcaseCommentComposer({
  groupId,
  placeholder = "이 모둠에게 질문이나 댓글을 남겨보세요",
}: {
  groupId: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(() => addShowcaseCommentAction(groupId, text));
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
        className="h-[38px] min-w-0 flex-1 rounded-lg border-[1.5px] border-transparent bg-[#f4f6f9] px-[13px] text-[13px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        className={`rounded-lg px-4 py-2 text-[12.5px] font-bold ${
          draft.trim() && !pending
            ? "cursor-pointer bg-[#003E81] text-white"
            : "cursor-default bg-[#e7ebf1] text-[#9aa3b2]"
        }`}
      >
        등록
      </button>
    </div>
  );
}

// 게스트 질문 내용 인라인 수정 (관리자 전용)
export function GuestQuestionEditButton({
  questionId,
  content,
}: {
  questionId: string;
  content: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [pending, startTransition] = useTransition();

  if (!editing)
    return (
      <button
        onClick={() => {
          setDraft(content);
          setEditing(true);
        }}
        className="cursor-pointer text-[11px] text-stone-300 hover:text-accent"
      >
        수정
      </button>
    );

  return (
    <span className="flex w-full items-center gap-1.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-white px-2.5 text-[12px] text-stone-800"
      />
      <button
        disabled={pending || !draft.trim()}
        onClick={() =>
          startTransition(async () => {
            await updateGuestQuestionAction(questionId, draft);
            setEditing(false);
          })
        }
        className="cursor-pointer text-[11px] font-semibold text-accent disabled:opacity-50"
      >
        저장
      </button>
      <button
        onClick={() => setEditing(false)}
        className="cursor-pointer text-[11px] text-stone-400"
      >
        취소
      </button>
    </span>
  );
}

// 게스트 링크 발급·공유 관리 (관리자 전용)
export function GuestLinkManager({ token }: { token: string | null }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/guest/${token}`
    : null;

  return (
    <div className="flex flex-col gap-2.5">
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            className="max-w-full truncate rounded-[9px] border border-line bg-paper px-3.5 py-2 text-[12.5px] text-accent hover:underline"
          >
            {url}
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="font-display cursor-pointer rounded-[9px] border border-line px-3.5 py-2 text-[12px] text-stone-600 hover:bg-paper"
          >
            {copied ? "복사됨 ✓" : "링크 복사"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm("링크를 재발급할까요? 기존 링크는 더 이상 접속할 수 없게 됩니다."))
                return;
              startTransition(() => issueGuestTokenAction());
            }}
            className="font-display cursor-pointer rounded-[9px] border border-line px-3.5 py-2 text-[12px] text-stone-600 hover:bg-paper disabled:opacity-50"
          >
            재발급
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm("게스트 링크를 비활성화할까요? 게스트 페이지 접속이 차단됩니다."))
                return;
              startTransition(() => disableGuestTokenAction());
            }}
            className="font-display cursor-pointer rounded-[9px] border border-line px-3.5 py-2 text-[12px] text-bad hover:bg-bad-soft disabled:opacity-50"
          >
            비활성화
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12.5px] text-stone-400">
            아직 발급된 게스트 링크가 없습니다
          </span>
          <button
            disabled={pending}
            onClick={() => startTransition(() => issueGuestTokenAction())}
            className="font-display cursor-pointer rounded-[9px] bg-accent px-4 py-2 text-[12.5px] text-white hover:bg-accent-strong disabled:opacity-50"
          >
            게스트 링크 발급
          </button>
        </div>
      )}
    </div>
  );
}
