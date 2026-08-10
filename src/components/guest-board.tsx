"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import {
  createGuestQuestionAction,
  createGuestAnswerAction,
  toggleGuestQuestionLikeAction,
} from "@/lib/actions/showcase";

// ── 브라우저 저장값 (이름 · 참여 방식 · 공감 키) ──────────────────
const NAME_KEY = "showcase-guest-name";
const MODE_KEY = "showcase-guest-mode";
const VOTER_KEY = "showcase-guest-key";

function makeStore(key: string) {
  const listeners = new Set<() => void>();
  return {
    get: () => (typeof window === "undefined" ? "" : (localStorage.getItem(key) ?? "")),
    set: (v: string | null) => {
      if (v) localStorage.setItem(key, v);
      else localStorage.removeItem(key);
      listeners.forEach((l) => l());
    },
    subscribe: (cb: () => void) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
  };
}
const nameStore = makeStore(NAME_KEY);
const modeStore = makeStore(MODE_KEY);
const voterStore = makeStore(VOTER_KEY);
const useGuestName = () => useSyncExternalStore(nameStore.subscribe, nameStore.get, () => "");
const useGuestMode = () =>
  useSyncExternalStore(modeStore.subscribe, modeStore.get, () => "") || "현장";
const useVoterKey = () => useSyncExternalStore(voterStore.subscribe, voterStore.get, () => "");
const ensureVoterKey = () => {
  let k = voterStore.get();
  if (!k) {
    k = crypto.randomUUID();
    voterStore.set(k);
  }
  return k;
};

const initialOf = (n: string) => (n || "게").trim().charAt(0);
const pad2 = (n: number) => String(n).padStart(2, "0");

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 서버에서 내려주는 데이터 형태 ─────────────────────────────────
export type GuestBoardReply = {
  id: string;
  author: string;
  presenter: boolean; // 학습자·관리자 계정 작성 (발표자 배지)
  createdAt: string;
  text: string;
};
export type GuestBoardQuestion = {
  id: string;
  author: string;
  authorKey: string | null;
  text: string;
  createdAt: string;
  likes: string[]; // voterKey 목록
  answered: boolean;
  replies: GuestBoardReply[];
};
export type GuestBoardGroup = {
  id: string;
  no: string;
  title: string;
  members: string[];
  links: { id: string; title: string; url: string; icon: { src: string; alt: string } | null }[];
  questions: GuestBoardQuestion[];
};
export type GuestBoardTexts = {
  eventBadge: string;
  welcomeTitle: string;
  welcomeDesc: string;
  agenda: { time: string; label: string }[];
  agendaNote: string;
  boardFooter: string;
};

function LsBrand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex items-center justify-center rounded-[7px] bg-[#003E81] font-extrabold text-white ${small ? "h-[33px] w-[33px] text-[11px]" : "h-9 w-9 text-[11px]"}`}
      >
        LS
      </div>
      <div className="flex flex-col leading-[1.25]">
        <span className="text-[13.5px] font-bold tracking-[-0.02em] text-[#12233c]">
          학습과학연구소
        </span>
        <span className="text-[9px] font-semibold tracking-[0.06em] text-[#8b96a8]">
          LEARNING SCIENCES RESEARCH INSTITUTE
        </span>
      </div>
    </div>
  );
}

// ── 입장(로그인) 화면 ─────────────────────────────────────────────
function LoginScreen({
  texts,
  initialName,
  onEntered,
}: {
  texts: GuestBoardTexts;
  initialName: string;
  onEntered: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  const mode = useGuestMode();
  const ok = !!draft.trim();

  const enter = () => {
    const n = draft.trim().slice(0, 30);
    if (!n) return;
    nameStore.set(n);
    onEntered();
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(150deg,#eef1fa_0%,#f5f6fa_45%,#ecf3f1_100%)]">
      <div className="absolute top-[120px] left-[56px] h-[110px] w-[110px] bg-[radial-gradient(#c8d2e2_1.6px,transparent_1.6px)] [background-size:15px_15px]" />
      <div className="absolute right-[90px] bottom-[80px] h-20 w-20 rounded-full border-[10px] border-[#e2e8f2]" />

      <header className="relative z-[2] flex flex-wrap items-center gap-4 px-6 py-5 sm:px-11">
        <LsBrand />
        <span className="hidden h-6 w-px bg-[#d8dfe9] sm:block" />
        <span className="hidden text-[14px] font-semibold tracking-[-0.01em] text-[#3d4d64] sm:inline">
          2026학년도 여름 인턴십 · 결과보고회
        </span>
      </header>

      <div className="relative z-[2] grid flex-1 place-items-center px-4 pt-6 pb-16 sm:px-6 sm:pt-9">
        <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[20px] shadow-[0_24px_60px_-30px_rgba(10,44,86,.35),0_2px_6px_rgba(10,44,86,.06)] md:grid-cols-[1.02fr_.98fr]">
          <div className="flex flex-col justify-center gap-7 bg-white px-7 py-10 sm:px-[54px] sm:py-[52px]">
            <div className="flex flex-col gap-4">
              {texts.eventBadge && (
                <span className="self-start rounded-[6px] bg-[#eaf0f8] px-[15px] py-2 text-[13px] font-bold tracking-[0.02em] text-[#003E81]">
                  {texts.eventBadge}
                </span>
              )}
              <h1 className="m-0 text-[26px] leading-[1.42] font-extrabold tracking-[-0.035em] whitespace-pre-line text-[#12233c] sm:text-[30px]">
                {texts.welcomeTitle}
              </h1>
              <p className="m-0 text-[15px] leading-[1.75] whitespace-pre-line text-[#5d6b80] sm:text-[15.5px]">
                {texts.welcomeDesc}
              </p>
            </div>

            <div className="flex flex-col gap-[11px]">
              <label className="text-[14px] font-bold text-[#3d4d64]">이름 / 소속</label>
              <div className="flex flex-wrap gap-2.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) enter();
                  }}
                  placeholder="예: 김철수 / 교육학과"
                  className="h-[58px] min-w-[200px] flex-1 rounded-[10px] border-[1.5px] border-transparent bg-[#f4f6f9] px-5 text-[16px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,62,129,.1)]"
                />
                <button
                  onClick={enter}
                  disabled={!ok}
                  className={`h-[58px] flex-none rounded-[10px] px-[30px] text-[14.5px] font-bold tracking-[-0.01em] whitespace-nowrap ${
                    ok
                      ? "cursor-pointer bg-[linear-gradient(135deg,#2a63b4,#003E81)] text-white shadow-[0_12px_24px_-10px_rgba(0,62,129,.55)] hover:brightness-115"
                      : "cursor-default bg-[#e7ebf1] text-[#9aa3b2]"
                  }`}
                >
                  입장하기
                </button>
              </div>
              <span className="text-[13px] text-[#8b96a8]">
                입장 후에도 우측 상단에서 이름을 변경할 수 있습니다.
              </span>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#edf0f5] pt-6">
              <span className="text-[14px] font-bold text-[#3d4d64]">참여 방식</span>
              <div className="flex gap-2.5">
                {(["현장", "온라인"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => modeStore.set(m)}
                    className={`h-[52px] cursor-pointer rounded-[10px] px-7 text-[15px] font-bold whitespace-nowrap ${
                      mode === m
                        ? "bg-[#003E81] text-white"
                        : "bg-white text-[#5d6b80] shadow-[inset_0_0_0_1px_#e4e9f0]"
                    }`}
                  >
                    {m} 참여
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-6 overflow-hidden bg-[linear-gradient(165deg,#003E81_0%,#0a2c56_100%)] px-7 py-10 sm:px-10 sm:py-[46px]">
            <div className="absolute -top-[50px] -right-[50px] h-[180px] w-[180px] rounded-full border-[1.5px] border-white/15" />
            <div className="absolute -top-5 -right-5 h-[120px] w-[120px] rounded-full border-[1.5px] border-white/10" />
            <div className="relative flex flex-col gap-2">
              <span className="h-[3px] w-[34px] bg-[#b8934a]" />
              <span className="text-[16px] font-bold tracking-[-0.01em] text-white">발표 순서</span>
            </div>
            <div className="relative flex flex-col">
              {texts.agenda.map((row, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 border-t border-white/15 py-[13px]"
                >
                  <span className="text-[15px] leading-[1.5] font-extrabold text-[#b8934a] tabular-nums">
                    {pad2(i + 1)}
                  </span>
                  <div className="flex flex-1 flex-col gap-[3px]">
                    <span className="text-[13.5px] leading-[1.55] font-semibold tracking-[-0.01em] text-white">
                      {row.label}
                    </span>
                    {row.time && (
                      <span className="text-[11.5px] text-[#93a9c8] tabular-nums">{row.time}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {texts.agendaNote && (
              <span className="relative text-[12px] leading-[1.65] text-[#93a9c8]">
                {texts.agendaNote}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 질문 보드 화면 ────────────────────────────────────────────────
function MainScreen({
  token,
  groups,
  texts,
  name,
  onEditName,
}: {
  token: string;
  groups: GuestBoardGroup[];
  texts: GuestBoardTexts;
  name: string;
  onEditName: () => void;
}) {
  const mode = useGuestMode();
  const myKey = useVoterKey();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [sort, setSort] = useState<"new" | "top">("new");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [anon, setAnon] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});

  const term = search.trim().toLowerCase();

  const submitQuestion = (groupId: string) => {
    const text = (drafts[groupId] ?? "").trim();
    if (!text) return;
    const author = anon[groupId] ? "익명" : name;
    setDrafts((d) => ({ ...d, [groupId]: "" }));
    startTransition(() =>
      createGuestQuestionAction(token, groupId, author, text, ensureVoterKey())
    );
  };

  const submitReply = (questionId: string) => {
    const text = (replyDrafts[questionId] ?? "").trim();
    if (!text) return;
    setReplyDrafts((d) => ({ ...d, [questionId]: "" }));
    startTransition(() => createGuestAnswerAction(token, questionId, name, text));
  };

  const toggleLike = (questionId: string) => {
    startTransition(() => toggleGuestQuestionLikeAction(token, questionId, ensureVoterKey()));
  };

  const miniBtn = (on: boolean) =>
    `cursor-pointer rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap ${
      on ? "bg-[#eaf0f8] text-[#003E81]" : "bg-transparent text-[#8b96a8]"
    }`;

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#eef1fa_0%,#f5f6fa_50%,#eef4f1_100%)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3.5 border-b border-[#e4e9f0] bg-white/90 px-4 py-3 backdrop-blur-md sm:px-7">
        <LsBrand small />
        <span className="hidden h-6 w-px bg-[#d8dfe9] md:block" />
        <span className="hidden text-[13.5px] font-semibold tracking-[-0.01em] text-[#3d4d64] md:inline">
          2026학년도 여름 인턴십 · 결과보고회
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-full border border-[#e4e9f0] bg-white py-[5px] pr-[7px] pl-[5px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf0f8] text-[12px] font-bold text-[#003E81]">
            {initialOf(name)}
          </div>
          <span className="text-[13px] font-semibold text-[#12233c]">{name}</span>
          <span className="rounded-full bg-[#eaf0f8] px-[9px] py-[3px] text-[11px] font-bold text-[#003E81]">
            {mode}
          </span>
          <button
            onClick={onEditName}
            className="cursor-pointer rounded-lg px-2 py-1 text-[12.5px] whitespace-nowrap text-[#8b96a8] hover:text-[#003E81]"
          >
            이름 변경
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[920px] flex-col gap-[18px] px-4 pt-6 pb-20 sm:px-10 sm:pt-[30px]">
        <div className="flex flex-col gap-[5px]">
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.035em] text-[#12233c] sm:text-[24px]">
            모둠별 발표 · 질의응답
          </h1>
          <p className="m-0 text-[14px] text-[#5d6b80]">
            발표 자료를 살펴보고 궁금한 점을 질문으로 남겨 주세요. 질문에 공감하거나 답글을 달 수
            있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[0_14px_34px_-22px_rgba(30,50,90,.28)]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="질문 내용 또는 작성자 검색"
            className="h-[38px] min-w-[180px] flex-1 border-none bg-transparent px-2.5 text-[13.5px] text-[#12233c] outline-none"
          />
          <span className="flex h-[34px] w-[34px] items-center justify-center text-[#5d6b80]">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
              <circle cx="7.2" cy="7.2" r="5.4" stroke="currentColor" strokeWidth="1.6" />
              <line
                x1="11.4"
                y1="11.4"
                x2="15.4"
                y2="15.4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>

        {groups.length === 0 && (
          <div className="rounded-[20px] bg-white p-8 text-center text-[13.5px] text-[#8b96a8] shadow-[0_18px_44px_-26px_rgba(30,50,90,.32)]">
            아직 확정된 자율연구 모둠이 없습니다.
          </div>
        )}

        {groups.map((g) => {
          let qs = [...g.questions];
          if (term)
            qs = qs.filter(
              (q) =>
                q.text.toLowerCase().includes(term) || q.author.toLowerCase().includes(term)
            );
          if (filter === "open") qs = qs.filter((q) => !q.answered);
          if (filter === "done") qs = qs.filter((q) => q.answered);
          if (sort === "top") qs.sort((a, b) => b.likes.length - a.likes.length);
          else qs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

          const draft = drafts[g.id] ?? "";
          const isAnon = !!anon[g.id];
          const active = !!draft.trim();

          return (
            <section
              key={g.id}
              className="overflow-hidden rounded-[20px] bg-white shadow-[0_18px_44px_-26px_rgba(30,50,90,.32),0_1px_3px_rgba(30,50,90,.04)]"
            >
              {/* 모둠 헤더 */}
              <div className="flex gap-4 bg-[linear-gradient(135deg,#f2f6fc,#eef2f9_60%,#f0f5f2)] px-5 pt-6 pb-5 sm:gap-[18px] sm:px-7">
                <span className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.02em] text-[#003E81] tabular-nums sm:text-[30px]">
                  {g.no}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <h2 className="m-0 text-[17px] leading-[1.5] font-bold tracking-[-0.03em] [overflow-wrap:anywhere] text-[#12233c] sm:text-[19px]">
                    {g.title}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {g.members.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-white px-[11px] py-1 text-[12.5px] font-medium text-[#3d4d64] shadow-[inset_0_0_0_1px_#c9d5e6]"
                      >
                        {m}
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
                {g.links.length === 0 ? (
                  <span className="py-1 text-[13px] text-[#8b96a8]">
                    아직 등록된 발표 자료가 없습니다. 발표 시작 전에 업로드됩니다.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {g.links.map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-[9px] border border-[#e4e9f0] bg-white py-2 pr-[13px] pl-[9px] hover:border-[#003E81] hover:bg-[#f8fafd]"
                      >
                        {l.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.icon.src}
                            alt={l.icon.alt}
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
                        <span className="text-[13px] font-semibold text-[#12233c]">{l.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* 게스트 질문 */}
              <div className="flex flex-col gap-[13px] px-5 pt-4 pb-[22px] sm:px-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11.5px] font-bold tracking-[0.05em] text-[#8b96a8]">
                    게스트 질문
                  </span>
                  <span className="rounded-full bg-[#f4f6f9] px-[9px] py-[2px] text-[11.5px] font-bold text-[#3d4d64] tabular-nums">
                    {g.questions.length}
                  </span>
                  <div className="flex-1" />
                  <div className="flex flex-wrap items-center gap-1">
                    <button onClick={() => setFilter("all")} className={miniBtn(filter === "all")}>
                      전체
                    </button>
                    <button onClick={() => setFilter("open")} className={miniBtn(filter === "open")}>
                      미답변
                    </button>
                    <button onClick={() => setFilter("done")} className={miniBtn(filter === "done")}>
                      답변 완료
                    </button>
                    <span className="mx-[3px] h-4 w-px bg-[#e4e9f0]" />
                    <button onClick={() => setSort("new")} className={miniBtn(sort === "new")}>
                      최신순
                    </button>
                    <button onClick={() => setSort("top")} className={miniBtn(sort === "top")}>
                      공감순
                    </button>
                  </div>
                </div>

                {g.questions.length === 0 && (
                  <div className="rounded-[11px] border border-dashed border-[#d8dfe9] p-6 text-center text-[13.5px] text-[#8b96a8]">
                    첫 질문을 남겨보세요.
                  </div>
                )}
                {g.questions.length > 0 && qs.length === 0 && (
                  <div className="rounded-[11px] bg-[#f8fafd] p-[18px] text-center text-[13px] text-[#8b96a8]">
                    현재 검색·필터 조건에 맞는 질문이 없습니다.
                  </div>
                )}

                <div className="flex flex-col gap-[9px]">
                  {qs.map((q) => {
                    const mine = !!myKey && q.authorKey === myKey;
                    const liked = !!myKey && q.likes.includes(myKey);
                    const rd = replyDrafts[q.id] ?? "";
                    return (
                      <div
                        key={q.id}
                        className={`flex gap-3 rounded-xl p-[14px] ${
                          mine
                            ? "bg-[#f6f9fd] shadow-[inset_0_0_0_1.5px_#c9d9ec]"
                            : "bg-[#fafbfc] shadow-[inset_0_0_0_1px_#eef1f5]"
                        }`}
                      >
                        <div className="flex h-[31px] w-[31px] flex-none items-center justify-center rounded-full bg-[#f0f2f7] text-[12px] font-bold text-[#3d4d64]">
                          {initialOf(q.author)}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold text-[#12233c]">{q.author}</span>
                            <span className="text-[11.5px] text-[#8b96a8]" suppressHydrationWarning>
                              {timeAgo(q.createdAt)}
                            </span>
                            {mine && (
                              <span className="rounded-[4px] bg-[#eaf0f8] px-2 py-[2px] text-[10.5px] font-bold text-[#003E81]">
                                내 질문
                              </span>
                            )}
                            {q.answered && (
                              <span className="rounded-[4px] bg-[#f7f1e4] px-2 py-[2px] text-[10.5px] font-bold text-[#8a6a2f]">
                                답변 완료
                              </span>
                            )}
                          </div>
                          <p className="m-0 text-[14px] leading-[1.7] [overflow-wrap:anywhere] text-[#2c3a4f]">
                            {q.text}
                          </p>

                          {q.replies.length > 0 && (
                            <div className="mt-[2px] flex flex-col gap-[7px] border-l-2 border-[#e4e9f0] pl-3">
                              {q.replies.map((r) => (
                                <div
                                  key={r.id}
                                  className={`flex flex-col gap-[3px] rounded-[9px] px-3 py-[9px] ${r.presenter ? "bg-[#f0f5fb]" : "bg-[#f7f8fa]"}`}
                                >
                                  <div className="flex flex-wrap items-center gap-[7px]">
                                    <span
                                      className={`text-[12px] font-bold ${r.presenter ? "text-[#003E81]" : "text-[#12233c]"}`}
                                    >
                                      {r.author}
                                    </span>
                                    {r.presenter && (
                                      <span className="rounded-[4px] bg-[#003E81] px-[7px] py-[2px] text-[10px] font-extrabold text-white">
                                        발표자
                                      </span>
                                    )}
                                    <span
                                      className="text-[11px] text-[#8b96a8]"
                                      suppressHydrationWarning
                                    >
                                      {timeAgo(r.createdAt)}
                                    </span>
                                  </div>
                                  <p className="m-0 text-[13px] leading-[1.65] [overflow-wrap:anywhere] text-[#3d4d64]">
                                    {r.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-px flex items-center gap-[7px]">
                            <button
                              onClick={() => toggleLike(q.id)}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-[5px] text-[12.5px] font-bold ${
                                liked
                                  ? "bg-[#eaf0f8] text-[#003E81] shadow-[inset_0_0_0_1px_#c9d9ec]"
                                  : "bg-white text-[#5d6b80] shadow-[inset_0_0_0_1px_#e4e9f0]"
                              }`}
                            >
                              <span className="text-[11px]">▲</span>
                              <span className="tabular-nums">공감 {q.likes.length}</span>
                            </button>
                            <button
                              onClick={() =>
                                setReplyOpen((o) => ({ ...o, [q.id]: !o[q.id] }))
                              }
                              className={`cursor-pointer rounded-full px-[11px] py-[5px] text-[12.5px] font-bold ${
                                replyOpen[q.id]
                                  ? "bg-[#eaf0f8] text-[#003E81]"
                                  : "bg-transparent text-[#8b96a8]"
                              }`}
                            >
                              답글 {q.replies.length || ""}
                            </button>
                          </div>

                          {replyOpen[q.id] && (
                            <div className="mt-1 flex gap-2">
                              <input
                                value={rd}
                                onChange={(e) =>
                                  setReplyDrafts((d) => ({
                                    ...d,
                                    [q.id]: e.target.value.slice(0, 200),
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.nativeEvent.isComposing)
                                    submitReply(q.id);
                                }}
                                placeholder="답글을 입력하세요"
                                className="h-[38px] min-w-0 flex-1 rounded-lg border-[1.5px] border-transparent bg-[#f4f6f9] px-[13px] text-[13px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white"
                              />
                              <button
                                onClick={() => submitReply(q.id)}
                                disabled={!rd.trim()}
                                className={`rounded-lg px-4 text-[12.5px] font-bold ${
                                  rd.trim()
                                    ? "cursor-pointer bg-[#003E81] text-white"
                                    : "cursor-default bg-[#e7ebf1] text-[#9aa3b2]"
                                }`}
                              >
                                등록
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 질문 작성 */}
                <div className="flex items-start gap-[11px] pt-1">
                  <div className="mt-1.5 flex h-[31px] w-[31px] flex-none items-center justify-center rounded-full bg-[#eaf0f8] text-[12px] font-bold text-[#003E81]">
                    {isAnon ? "익" : initialOf(name)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[9px] rounded-xl border-[1.5px] border-transparent bg-[#f4f6f9] px-[13px] py-[11px] focus-within:border-[#003E81] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(0,62,129,.08)]">
                    <textarea
                      rows={2}
                      value={draft}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [g.id]: e.target.value.slice(0, 300) }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitQuestion(g.id);
                      }}
                      placeholder="이 모둠에게 궁금한 점을 남겨보세요"
                      className="w-full resize-none border-none bg-transparent p-[2px] text-[14px] leading-[1.65] text-[#12233c] outline-none"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        onClick={() => setAnon((a) => ({ ...a, [g.id]: !a[g.id] }))}
                        className={`cursor-pointer rounded-full px-3 py-[5px] text-[12px] font-bold ${
                          isAnon
                            ? "bg-[#eaf0f8] text-[#003E81] shadow-[inset_0_0_0_1.5px_#c9d9ec]"
                            : "bg-transparent text-[#8b96a8] shadow-[inset_0_0_0_1px_#dbe1ea]"
                        }`}
                      >
                        익명으로 남기기
                      </button>
                      <div className="flex items-center gap-[11px]">
                        <span
                          className={`text-[11.5px] tabular-nums ${draft.length > 270 ? "text-[#b8934a]" : "text-[#9aa3b2]"}`}
                        >
                          {draft.length}/300
                        </span>
                        <button
                          onClick={() => submitQuestion(g.id)}
                          disabled={!active}
                          className={`rounded-[10px] px-[18px] py-[9px] text-[13px] font-bold tracking-[-0.01em] whitespace-nowrap ${
                            active
                              ? "cursor-pointer bg-[linear-gradient(135deg,#2a63b4,#003E81)] text-white shadow-[0_8px_18px_-8px_rgba(0,62,129,.5)] hover:brightness-115"
                              : "cursor-default bg-[#e7ebf1] text-[#9aa3b2]"
                          }`}
                        >
                          질문 남기기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {texts.boardFooter && (
          <p className="m-0 mt-2 text-center text-[12.5px] text-[#8b96a8]">{texts.boardFooter}</p>
        )}
      </main>
    </div>
  );
}

// ── 진입점 — 이름이 없거나 변경 중이면 입장 화면 ──────────────────
export function GuestExperience({
  token,
  groups,
  texts,
}: {
  token: string;
  groups: GuestBoardGroup[];
  texts: GuestBoardTexts;
}) {
  const name = useGuestName();
  const [editing, setEditing] = useState(false);

  if (!name || editing)
    return <LoginScreen texts={texts} initialName={name} onEntered={() => setEditing(false)} />;
  return (
    <MainScreen
      token={token}
      groups={groups}
      texts={texts}
      name={name}
      onEditName={() => setEditing(true)}
    />
  );
}
