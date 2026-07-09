"use client";

import { useEffect, useRef } from "react";
import type { QuestionType } from "@prisma/client";
import type { LiveStatePayload } from "@/lib/live";
import { typeLabel } from "@/lib/quiz";
import { initialOf } from "@/lib/utils";

interface HostQuestion {
  order: number;
  type: QuestionType;
  text: string;
  explanation: string;
  shortAnswers: string[];
  options: { order: number; label: string; isCorrect: boolean }[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

// 화면 공유용 프레젠테이션 모드 (다크 스테이지, 대형 타이포)
export function Presentation({
  state,
  question,
  pending,
  advanceLabel,
  onAdvance,
  onEnd,
  onClose,
}: {
  state: LiveStatePayload;
  question: HostQuestion | undefined;
  pending: boolean;
  advanceLabel: string;
  onAdvance: () => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const reveal = state.reveal;
  const isReveal = state.status === "REVEAL";
  const maxCount = Math.max(1, state.answeredCount);
  const ranking = reveal?.ranking ?? [];

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-stone-950 text-white">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[12px] font-bold text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
            </span>
            LIVE
          </span>
          <span className="font-display text-[17px] text-white/90">
            {state.week}주차 · {state.quizTitle}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-white/50">
          <span>
            참가자 <b className="text-white/90">{state.participantCount}</b>
          </span>
          {state.status !== "LOBBY" && state.status !== "ENDED" && (
            <span>
              문항{" "}
              <b className="text-white/90">
                {state.index + 1}/{state.total}
              </b>
            </span>
          )}
          <button
            onClick={toggleFullscreen}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            전체 화면
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            ✕ 닫기
          </button>
        </div>
      </div>

      {/* 무대 */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-10 pb-4">
        {/* 대기실 */}
        {state.status === "LOBBY" && (
          <div className="flex max-w-3xl flex-col items-center gap-8 text-center">
            <div className="font-display text-5xl">곧 시작합니다</div>
            <div className="text-lg text-white/50">
              스터디 홈의 <span className="text-red-400">LIVE 배너</span>를 눌러 입장하세요
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {(state.participants ?? []).map((n, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/10 px-4 py-1.5 text-[15px] font-medium text-white/90"
                >
                  {n}
                </span>
              ))}
              {(state.participants ?? []).length === 0 && (
                <span className="text-white/40">아직 입장한 학습자가 없습니다</span>
              )}
            </div>
          </div>
        )}

        {/* 문제 / 결과 */}
        {(state.status === "QUESTION" || isReveal) && question && (
          <div className={`grid w-full max-w-6xl gap-10 ${isReveal ? "lg:grid-cols-[1fr_320px]" : ""}`}>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-3">
                <span className="text-[15px] font-semibold text-sky-300">
                  Q{state.index + 1} · {typeLabel(question.type)}
                </span>
                <span className="text-[34px] leading-snug font-bold tracking-tight">
                  {question.text}
                </span>
              </div>

              {question.type !== "SHORT" ? (
                <div className="flex flex-col gap-3">
                  {question.options.map((o) => {
                    const showAnswer = isReveal && o.isCorrect;
                    const dist = reveal?.distribution.find((d) => d.order === o.order);
                    return (
                      <div
                        key={o.order}
                        className={`relative overflow-hidden rounded-2xl border px-6 py-4 ${
                          showAnswer ? "border-sky-300 bg-sky-400/10" : "border-white/15 bg-white/5"
                        }`}
                      >
                        {isReveal && dist && (
                          <div
                            className={`absolute inset-y-0 left-0 ${showAnswer ? "bg-sky-400/25" : "bg-white/10"}`}
                            style={{ width: `${Math.round((dist.count / maxCount) * 100)}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between gap-4">
                          <span className="text-[20px] text-white/95">
                            {showAnswer && <span className="mr-2 font-bold text-sky-300">✓</span>}
                            {o.label}
                          </span>
                          {isReveal && dist && (
                            <span
                              className={`text-[16px] font-bold ${showAnswer ? "text-sky-300" : "text-white/40"}`}
                            >
                              {dist.count}명
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {isReveal ? (
                    <>
                      <div className="rounded-2xl border border-sky-300 bg-sky-400/10 px-6 py-4 text-[20px]">
                        정답: <b className="text-sky-300">{question.shortAnswers.join(" / ")}</b>
                      </div>
                      {(reveal?.shortTexts.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {reveal!.shortTexts.map((t, i) => (
                            <span
                              key={i}
                              className={`rounded-full px-4 py-1.5 text-[15px] font-medium ${
                                t.correct
                                  ? "bg-sky-400/15 text-sky-300"
                                  : "bg-white/10 text-white/60"
                              }`}
                            >
                              {t.text} × {t.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-[18px] text-white/50">
                      정답을 입력해 주세요 — 결과 공개 시 정답이 표시됩니다
                    </div>
                  )}
                </div>
              )}

              {isReveal && question.explanation && (
                <div className="flex gap-3 rounded-2xl bg-white/5 px-6 py-4">
                  <span className="flex-none text-[14px] font-bold text-white/50">해설</span>
                  <span className="text-[16px] leading-relaxed text-white/80">
                    {question.explanation}
                  </span>
                </div>
              )}

              {/* 제출 진행 (문제 중) */}
              {state.status === "QUESTION" && (
                <div className="flex items-center gap-4">
                  <span className="text-[17px] font-bold text-sky-300">
                    {state.answeredCount}
                    <span className="font-normal text-white/40"> / {state.participantCount} 제출</span>
                  </span>
                  <div className="h-2.5 max-w-md flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{
                        width: `${state.participantCount ? Math.round((state.answeredCount / state.participantCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 중간 랭킹 TOP 5 */}
            {isReveal && (
              <div className="flex flex-col gap-3 self-start rounded-2xl bg-white/5 p-6">
                <div className="font-display text-[17px] text-white/80">현재 랭킹 TOP 5</div>
                <div className="flex flex-col gap-1">
                  {ranking.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                      <span className="w-8 text-center text-[18px] font-bold">
                        {MEDALS[i] ?? <span className="text-white/40">{i + 1}</span>}
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold">
                        {initialOf(r.name)}
                      </span>
                      <span className="text-[17px] font-medium text-white/95">{r.name}</span>
                    </div>
                  ))}
                  {ranking.length === 0 && <span className="text-white/40">참가자 없음</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 종료: 최종 랭킹 */}
        {state.status === "ENDED" && (
          <div className="flex w-full max-w-2xl flex-col items-center gap-8">
            <div className="font-display text-4xl">🏁 최종 랭킹</div>
            <div className="flex w-full flex-col gap-1.5">
              {ranking.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 rounded-xl px-5 py-3 ${
                    i < 3 ? "bg-white/10" : ""
                  }`}
                >
                  <span className="w-9 text-center text-[22px] font-bold">
                    {MEDALS[i] ?? <span className="text-white/40 text-[17px]">{i + 1}</span>}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[14px] font-semibold">
                    {initialOf(r.name)}
                  </span>
                  <span className={`text-[19px] font-medium ${i < 3 ? "text-white" : "text-white/70"}`}>
                    {r.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 바 */}
      {state.status !== "ENDED" && (
        <div className="flex items-center justify-between border-t border-white/10 px-8 py-4">
          <button
            onClick={onEnd}
            disabled={pending}
            className="cursor-pointer rounded-xl border border-white/15 px-5 py-3 text-[14px] text-white/60 hover:bg-white/10 disabled:opacity-50"
          >
            세션 종료
          </button>
          <button
            onClick={onAdvance}
            disabled={pending}
            className="font-display cursor-pointer rounded-xl bg-sky-500 px-10 py-3 text-[17px] text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {pending ? "진행 중…" : advanceLabel}
          </button>
        </div>
      )}
    </div>
  );
}
