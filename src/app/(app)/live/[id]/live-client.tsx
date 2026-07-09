"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { joinLiveAction, submitLiveAnswerAction } from "@/lib/actions/live";
import { useLiveState } from "@/components/live/use-live-state";
import { RankingList } from "@/components/live/ranking";
import { EmojiBurst } from "@/components/live/emoji-burst";
import { typeLabel, type AnswerInput } from "@/lib/quiz";

export function LiveClient({ sessionId }: { sessionId: string }) {
  const { state, error, refresh } = useLiveState(sessionId);
  const [answer, setAnswer] = useState<AnswerInput>({});
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 입장 시 세션 참여
  useEffect(() => {
    joinLiveAction(sessionId).then(() => refresh());
  }, [sessionId, refresh]);

  // 문항이 바뀌면 입력 초기화 (렌더 단계 리셋 패턴)
  const questionKey = state ? `${state.index}-${state.status}` : "";
  const [prevQuestionKey, setPrevQuestionKey] = useState(questionKey);
  if (questionKey !== prevQuestionKey) {
    setPrevQuestionKey(questionKey);
    if (state?.status === "QUESTION") {
      setAnswer({});
      setSubmitError(null);
    }
  }

  if (error)
    return (
      <div className="rounded-[14px] border border-line bg-white p-7 text-sm text-stone-400">
        {error}{" "}
        <Link href="/quiz" className="text-accent underline">
          스터디 홈으로
        </Link>
      </div>
    );
  if (!state) return <div className="p-7 text-sm text-stone-400">불러오는 중…</div>;

  const submit = () => {
    startTransition(async () => {
      setAnsweredIndex(state.index); // 낙관적: 즉시 '제출 완료' 화면
      const res = await submitLiveAnswerAction(sessionId, answer);
      if (res.error) {
        setSubmitError(res.error);
        setAnsweredIndex(null);
      }
      refresh();
    });
  };

  const iAnswered = state.myAnswered || answeredIndex === state.index;
  const q = state.question;
  const sel = new Set(answer.selectedOptions ?? []);

  // 정답 공개 시 내가 맞혔으면 이모지 축하 (문항당 1회)
  const burstTrigger =
    state.status === "REVEAL" && state.reveal?.myCorrect ? `q${state.index}` : null;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <EmojiBurst trigger={burstTrigger} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-bad-soft px-3 py-1 text-[11.5px] font-bold text-bad">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-bad" />
            </span>
            LIVE
          </span>
          <span className="font-display text-[15px] text-stone-700">{state.quizTitle}</span>
        </div>
        <span className="text-xs text-stone-400">
          {state.status === "LOBBY"
            ? `참가자 ${state.participantCount}명`
            : `${state.index + 1} / ${state.total} 문항`}
        </span>
      </div>

      {/* 대기실 */}
      {state.status === "LOBBY" && (
        <div className="flex flex-col items-center gap-4 rounded-[14px] border border-line bg-white px-7 py-14">
          <div className="font-display text-[19px] text-stone-800">곧 시작합니다</div>
          <div className="text-[13px] text-stone-500">
            선생님이 첫 문제를 열면 자동으로 시작됩니다
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {(state.participants ?? []).map((n, i) => (
              <span
                key={i}
                className="rounded-full bg-line-soft px-3 py-1 text-xs font-medium text-stone-600"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 문제 풀이 */}
      {state.status === "QUESTION" && q && (
        <>
          {!iAnswered ? (
            <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[26px] py-6">
              <div className="flex items-start gap-3">
                <span className="flex-none rounded-[7px] bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                  Q{state.index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-stone-400">
                    {typeLabel(q.type)}
                  </span>
                  <span className="text-[15px] leading-normal font-semibold text-stone-800">
                    {q.text}
                  </span>
                </div>
              </div>

              {q.type !== "SHORT" ? (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt) => {
                    const selected = sel.has(opt.order);
                    return (
                      <button
                        key={opt.order}
                        type="button"
                        onClick={() => {
                          const cur = new Set(answer.selectedOptions ?? []);
                          if (q.type === "MULTI") {
                            if (cur.has(opt.order)) cur.delete(opt.order);
                            else cur.add(opt.order);
                          } else {
                            cur.clear();
                            cur.add(opt.order);
                          }
                          setAnswer({ selectedOptions: [...cur] });
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] px-4 py-3 text-left hover:border-accent-border ${
                          selected ? "border-accent bg-accent-soft" : "border-line bg-white"
                        }`}
                      >
                        <div
                          className={`h-[18px] w-[18px] flex-none border-2 ${
                            q.type === "MULTI" ? "rounded-[5px]" : "rounded-full"
                          } ${
                            selected
                              ? "border-accent bg-accent shadow-[inset_0_0_0_3px_#fff]"
                              : "border-stone-300 bg-white"
                          }`}
                        />
                        <span className="text-[13.5px] text-stone-800">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={answer.text ?? ""}
                  onChange={(e) => setAnswer({ text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
                  }}
                  placeholder="답을 입력하세요"
                  className="rounded-[10px] border-[1.5px] border-line bg-paper px-4 py-3 text-[13.5px] text-stone-800"
                />
              )}

              {submitError && <p className="text-xs font-medium text-bad">{submitError}</p>}
              <button
                onClick={submit}
                className="font-display cursor-pointer rounded-xl bg-accent py-3 text-[15px] text-white hover:bg-accent-strong"
              >
                제출하기
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-white px-7 py-14">
              <div className="text-3xl">✅</div>
              <div className="font-display text-[17px] text-stone-800">제출 완료</div>
              <div className="text-[13px] text-stone-500">
                다른 학생들을 기다리는 중 · {state.answeredCount}/{state.participantCount} 제출
              </div>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${state.participantCount ? Math.round((state.answeredCount / state.participantCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* 결과 공개 */}
      {state.status === "REVEAL" && q && state.reveal && (
        <>
          <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[26px] py-6">
            <div className="flex items-start gap-3">
              <span
                className={`flex-none rounded-[7px] px-2 py-1 text-[11.5px] font-bold ${
                  state.reveal.myCorrect === null
                    ? "bg-line-soft text-stone-500"
                    : state.reveal.myCorrect
                      ? "bg-accent-soft text-accent"
                      : "bg-bad-soft text-bad"
                }`}
              >
                {state.reveal.myCorrect === null
                  ? "무응답"
                  : state.reveal.myCorrect
                    ? "정답!"
                    : "오답"}
              </span>
              <span className="text-[15px] leading-normal font-semibold text-stone-800">
                {q.text}
              </span>
            </div>

            {q.type !== "SHORT" ? (
              <Distribution
                distribution={state.reveal.distribution}
                totalAnswered={state.answeredCount}
              />
            ) : (
              <div className="flex flex-col gap-[7px] text-[13px]">
                <div className="flex gap-2.5">
                  <span className="w-11 flex-none text-stone-400">정답</span>
                  <span className="font-semibold text-accent">
                    {state.reveal.shortAnswers.join(" / ")}
                  </span>
                </div>
                {state.reveal.shortTexts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {state.reveal.shortTexts.map((t, i) => (
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

            {state.reveal.explanation && (
              <div className="flex gap-2.5 rounded-[10px] bg-paper px-4 py-3.5">
                <span className="mt-px flex-none text-[11.5px] font-bold text-stone-500">해설</span>
                <span className="text-[13px] leading-[1.65] text-stone-600">
                  {state.reveal.explanation}
                </span>
              </div>
            )}
          </div>

          <RankingList ranking={state.reveal.ranking} limit={5} />
          {state.reveal.isLast && (
            <div className="text-center text-xs text-stone-400">
              선생님이 세션을 마치면 최종 결과가 표시됩니다
            </div>
          )}
        </>
      )}

      {/* 종료 */}
      {state.status === "ENDED" && (
        <>
          <div className="flex flex-col items-center gap-2 rounded-[14px] border border-line bg-white px-7 py-10">
            <div className="text-3xl">🏁</div>
            <div className="font-display text-[19px] text-stone-800">세션이 종료되었습니다</div>
            <div className="text-[13px] text-stone-500">
              결과는 스터디 홈의 지난 퀴즈 기록에서 다시 볼 수 있습니다
            </div>
          </div>
          {state.reveal && <RankingList ranking={state.reveal.ranking} title="최종 랭킹" />}
          <Link
            href="/quiz"
            className="font-display rounded-xl bg-accent py-3 text-center text-[15px] text-white hover:bg-accent-strong"
          >
            스터디 홈으로
          </Link>
        </>
      )}
    </div>
  );
}

function Distribution({
  distribution,
  totalAnswered,
}: {
  distribution: { order: number; label: string; count: number; correct: boolean }[];
  totalAnswered: number;
}) {
  const max = Math.max(1, totalAnswered);
  return (
    <div className="flex flex-col gap-[7px]">
      {distribution.map((d) => (
        <div
          key={d.order}
          className={`relative overflow-hidden rounded-[10px] border-[1.5px] px-4 py-2.5 ${
            d.correct ? "border-accent" : "border-line-soft"
          }`}
        >
          <div
            className={`absolute inset-y-0 left-0 ${d.correct ? "bg-accent-soft" : "bg-line-soft"}`}
            style={{ width: `${Math.round((d.count / max) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between">
            <span className="text-[13.5px] text-stone-800">
              {d.correct && <span className="mr-1.5 font-bold text-accent">✓</span>}
              {d.label}
            </span>
            <span className={`text-xs font-semibold ${d.correct ? "text-accent" : "text-stone-400"}`}>
              {d.count}명
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
