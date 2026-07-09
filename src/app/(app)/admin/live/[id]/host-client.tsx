"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { QuestionType } from "@prisma/client";
import { advanceLiveAction, endLiveAction } from "@/lib/actions/live";
import { useLiveState } from "@/components/live/use-live-state";
import { RankingList } from "@/components/live/ranking";
import { typeLabel } from "@/lib/quiz";

interface HostQuestion {
  order: number;
  type: QuestionType;
  text: string;
  explanation: string;
  shortAnswers: string[];
  options: { order: number; label: string; isCorrect: boolean }[];
}

export function HostClient({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: HostQuestion[];
}) {
  const { state, refresh } = useLiveState(sessionId);
  const [pending, startTransition] = useTransition();

  if (!state) return <div className="p-7 text-sm text-stone-400">불러오는 중…</div>;

  const q = questions.find((x) => x.order === state.index);
  const advance = () =>
    startTransition(async () => {
      await advanceLiveAction(sessionId);
      refresh();
    });
  const end = () =>
    startTransition(async () => {
      if (confirm("세션을 종료할까요? 지금까지의 결과가 제출 기록으로 저장됩니다.")) {
        await endLiveAction(sessionId);
        refresh();
      }
    });

  const advanceLabel =
    state.status === "LOBBY"
      ? "첫 문제 시작"
      : state.status === "QUESTION"
        ? "결과 공개"
        : state.reveal?.isLast
          ? "세션 종료 · 최종 결과"
          : "다음 문제";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-bad-soft px-3 py-1 text-[11.5px] font-bold text-bad">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-bad" />
            </span>
            LIVE 진행
          </span>
          <span className="font-display text-[16px] text-stone-700">
            {state.week}주차 · {state.quizTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.status !== "ENDED" && (
            <>
              <button
                onClick={end}
                disabled={pending}
                className="cursor-pointer rounded-[9px] border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-stone-500 hover:border-stone-300 disabled:opacity-60"
              >
                세션 종료
              </button>
              <button
                onClick={advance}
                disabled={pending}
                className="font-display cursor-pointer rounded-[9px] bg-accent px-6 py-2.5 text-[14px] text-white hover:bg-accent-strong disabled:opacity-60"
              >
                {pending ? "진행 중…" : advanceLabel}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 rounded-xl border border-line bg-white px-5 py-3.5 text-[12.5px] text-stone-500">
        <span>
          참가자 <b className="text-stone-800">{state.participantCount}명</b>
        </span>
        {state.status !== "LOBBY" && state.status !== "ENDED" && (
          <>
            <span>
              문항 <b className="text-stone-800">{state.index + 1}</b> / {state.total}
            </span>
            <span className="flex flex-1 items-center gap-2.5">
              제출{" "}
              <b className="text-accent">
                {state.answeredCount}/{state.participantCount}
              </b>
              <span className="h-1.5 max-w-56 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${state.participantCount ? Math.round((state.answeredCount / state.participantCount) * 100) : 0}%`,
                  }}
                />
              </span>
              {state.status === "QUESTION" && (
                <span className="text-[11.5px] text-stone-400">전원 제출 시 자동 공개</span>
              )}
            </span>
          </>
        )}
      </div>

      {/* 대기실: 참가자 명단 */}
      {state.status === "LOBBY" && (
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-7">
          <div className="font-display text-[15px] text-stone-700">
            대기실 — 학습자들이 스터디 홈의 배너로 입장합니다
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(state.participants ?? []).length === 0 && (
              <span className="text-[13px] text-stone-400">아직 입장한 학습자가 없습니다</span>
            )}
            {(state.participants ?? []).map((n, i) => (
              <span
                key={i}
                className="rounded-full bg-line-soft px-3 py-1.5 text-[12.5px] font-medium text-stone-700"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 진행 중 문항 (정답 표시 포함) */}
      {(state.status === "QUESTION" || state.status === "REVEAL") && q && (
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[26px] py-6">
          <div className="flex items-start gap-3">
            <span className="flex-none rounded-[7px] bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
              Q{state.index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-stone-400">{typeLabel(q.type)}</span>
              <span className="text-[15px] leading-normal font-semibold text-stone-800">
                {q.text}
              </span>
            </div>
          </div>

          {q.type !== "SHORT" ? (
            <div className="flex flex-col gap-[7px]">
              {q.options.map((o) => {
                // 화면 공유 대비: 정답 표시는 결과 공개 시점에만
                const showAnswer = state.status === "REVEAL" && o.isCorrect;
                const dist = state.reveal?.distribution.find((d) => d.order === o.order);
                const max = Math.max(1, state.answeredCount);
                return (
                  <div
                    key={o.order}
                    className={`relative overflow-hidden rounded-[10px] border-[1.5px] px-4 py-2.5 ${
                      showAnswer ? "border-accent" : "border-line-soft"
                    }`}
                  >
                    {state.status === "REVEAL" && dist && (
                      <div
                        className={`absolute inset-y-0 left-0 ${showAnswer ? "bg-accent-soft" : "bg-line-soft"}`}
                        style={{ width: `${Math.round((dist.count / max) * 100)}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between">
                      <span className="text-[13.5px] text-stone-800">
                        {showAnswer && <span className="mr-1.5 font-bold text-accent">✓</span>}
                        {o.label}
                      </span>
                      {state.status === "REVEAL" && dist && (
                        <span
                          className={`text-xs font-semibold ${showAnswer ? "text-accent" : "text-stone-400"}`}
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
            <div className="flex flex-col gap-2 text-[13px]">
              {state.status === "REVEAL" ? (
                <div className="rounded-lg bg-paper px-3.5 py-2.5 text-stone-700">
                  정답 인정: <b className="text-accent">{q.shortAnswers.join(" | ")}</b>
                </div>
              ) : (
                <div className="rounded-lg bg-paper px-3.5 py-2.5 text-stone-400">
                  단답형 — 정답은 결과 공개 시 표시됩니다
                </div>
              )}
              {state.status === "REVEAL" && (state.reveal?.shortTexts.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {state.reveal!.shortTexts.map((t, i) => (
                    <span
                      key={i}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                        t.correct ? "bg-accent-soft text-accent" : "bg-line-soft text-stone-500"
                      }`}
                    >
                      {t.text} × {t.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {q.explanation && state.status === "REVEAL" && (
            <div className="flex gap-2.5 rounded-[10px] bg-paper px-4 py-3.5">
              <span className="mt-px flex-none text-[11.5px] font-bold text-stone-500">해설</span>
              <span className="text-[13px] leading-[1.65] text-stone-600">{q.explanation}</span>
            </div>
          )}
        </div>
      )}

      {/* 랭킹 (결과 공개 및 종료 시) */}
      {state.reveal && (state.status === "REVEAL" || state.status === "ENDED") && (
        <RankingList
          ranking={state.reveal.ranking}
          title={state.status === "ENDED" ? "최종 랭킹" : "현재 랭킹"}
        />
      )}

      {state.status === "ENDED" && (
        <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-6 py-5">
          <span className="text-[13px] text-stone-500">
            세션이 종료되었고 결과가 제출 기록으로 저장되었습니다.
          </span>
          <Link
            href={`/admin/results?week=${state.week}`}
            className="font-display rounded-[9px] bg-accent px-5 py-2.5 text-[13.5px] text-white hover:bg-accent-strong"
          >
            제출 현황 보기
          </Link>
        </div>
      )}
    </div>
  );
}
