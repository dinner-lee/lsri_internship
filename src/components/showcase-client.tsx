"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { UserAvatar } from "@/components/user-menu";
import {
  setGroupTopicAction,
  addShowcaseLinkAction,
  deleteShowcaseLinkAction,
  createGuestQuestionAction,
  createGuestAnswerAction,
  updateGuestQuestionAction,
  answerGuestQuestionAction,
  deleteGuestAnswerAction,
  deleteGuestQuestionAction,
  issueGuestTokenAction,
  disableGuestTokenAction,
} from "@/lib/actions/showcase";

// 게스트 이름은 브라우저에 저장해 매번 입력하지 않도록 함 (같은 탭 내 변경도 즉시 반영)
const GUEST_NAME_KEY = "showcase-guest-name";
const guestNameListeners = new Set<() => void>();
const storedGuestName = () =>
  typeof window === "undefined" ? "" : (localStorage.getItem(GUEST_NAME_KEY) ?? "");
const setStoredGuestName = (v: string | null) => {
  if (v) localStorage.setItem(GUEST_NAME_KEY, v);
  else localStorage.removeItem(GUEST_NAME_KEY);
  guestNameListeners.forEach((l) => l());
};
const subscribeGuestName = (cb: () => void) => {
  guestNameListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    guestNameListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const useGuestName = () => useSyncExternalStore(subscribeGuestName, storedGuestName, () => "");

// 모둠 연구 주제 인라인 편집 (모둠원·관리자) — 비우고 저장하면 앵커 주제로 되돌아감
export function GroupTopicEditor({
  groupId,
  topic,
  isCustom,
}: {
  groupId: string;
  topic: string;
  isCustom: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic);
  const [pending, startTransition] = useTransition();

  if (!editing)
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] text-stone-400">
        주제: <b className="font-medium text-stone-600 [overflow-wrap:anywhere]">{topic}</b>
        <button
          onClick={() => {
            setDraft(topic);
            setEditing(true);
          }}
          className="cursor-pointer text-[11px] text-stone-300 hover:text-accent"
        >
          수정
        </button>
      </span>
    );

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
        className="h-9 rounded-[9px] border border-line bg-white px-3.5 text-[12.5px] text-stone-800 sm:w-52"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder="링크 주소 (https://...)"
        className="h-9 flex-1 rounded-[9px] border border-line bg-white px-3.5 text-[12.5px] text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending || !title.trim() || !url.trim()}
        className="font-display h-9 rounded-[9px] bg-accent px-4 text-[12.5px] text-white hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
      >
        추가
      </button>
    </div>
  );
}

const DELETE_CONFIRM = {
  link: "이 발표 자료 링크를 삭제할까요?",
  question: "이 게스트 질문을 삭제할까요?",
  answer: "이 답변을 삭제할까요?",
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
        className="h-9 flex-1 rounded-full border border-line bg-white px-4 text-[12.5px] text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        aria-label="답변 등록"
        className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-accent text-[15px] text-white hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
      >
        ↑
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

// 게스트 입력 공통 (질문·답글) — 저장된 이름을 자동 사용, 이름 아바타 표시
function GuestComposer({
  placeholder,
  ariaLabel,
  onSubmit,
}: {
  placeholder: string;
  ariaLabel: string;
  onSubmit: (name: string, text: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const name = useGuestName();

  const submit = () => {
    const n = storedGuestName().trim();
    const text = draft.trim();
    if (!n || !text) return;
    setDraft("");
    startTransition(() => onSubmit(n, text));
  };

  return (
    <div className="flex items-center gap-2">
      {name && <UserAvatar name={name} image={null} size={26} />}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder={placeholder}
        className="h-9 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-[12.5px] text-stone-800"
      />
      <button
        onClick={submit}
        disabled={pending || !draft.trim()}
        aria-label={ariaLabel}
        className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-accent text-[15px] text-white hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
      >
        ↑
      </button>
    </div>
  );
}

// 게스트 질문 작성 폼 (/guest/[token] 공개 페이지 — 저장된 이름 자동 사용)
export function GuestQuestionForm({ token, groupId }: { token: string; groupId: string }) {
  return (
    <GuestComposer
      placeholder="이 모둠에게 궁금한 점을 남겨보세요"
      ariaLabel="질문 등록"
      onSubmit={(n, text) => createGuestQuestionAction(token, groupId, n, text)}
    />
  );
}

// 게스트 답변·답글 작성 (스레드)
export function GuestAnswerComposer({
  token,
  questionId,
  parentId = null,
  placeholder = "답글을 남겨보세요",
}: {
  token: string;
  questionId: string;
  parentId?: string | null;
  placeholder?: string;
}) {
  return (
    <GuestComposer
      placeholder={placeholder}
      ariaLabel="답글 등록"
      onSubmit={(n, text) => createGuestAnswerAction(token, questionId, n, text, parentId)}
    />
  );
}

// 게스트 신원 게이트 — 최초 진입 시 이름·소속을 입력받아 브라우저에 저장
export function GuestGate({ children }: { children: React.ReactNode }) {
  const name = useGuestName();
  const [draft, setDraft] = useState("");

  if (!name) {
    const enter = () => {
      const n = draft.trim().slice(0, 30);
      if (!n) return;
      setStoredGuestName(n);
    };
    return (
      <div className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-5 rounded-[18px] border border-line bg-white px-7 py-10 text-center">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-[19px] font-bold tracking-tight text-stone-800">
            결과보고회에 오신 것을 환영합니다
          </span>
          <span className="text-[12.5px] leading-relaxed text-stone-400">
            사용하실 이름 또는 소속을 입력해 주세요.
            <br />
            질문과 답글에 함께 표시됩니다.
          </span>
        </div>
        <div className="flex w-full items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) enter();
            }}
            autoFocus
            placeholder="예: 김철수 / 교육학과"
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-paper px-4 text-[13.5px] text-stone-800"
          />
          <button
            onClick={enter}
            disabled={!draft.trim()}
            className="font-display h-11 flex-none cursor-pointer rounded-[10px] bg-accent px-5 text-[13.5px] text-white hover:bg-accent-strong disabled:cursor-default disabled:bg-line disabled:text-stone-400"
          >
            입장하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-2 self-end">
        <UserAvatar name={name} image={null} size={26} />
        <span className="text-[12.5px] font-semibold text-stone-600">{name}</span>
        <button
          onClick={() => {
            setDraft("");
            setStoredGuestName(null);
          }}
          className="cursor-pointer text-[11px] text-stone-400 hover:text-accent"
        >
          이름 변경
        </button>
      </div>
      {children}
    </div>
  );
}
