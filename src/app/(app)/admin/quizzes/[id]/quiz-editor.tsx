"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveQuizAction, deleteQuizAction, type QuizFormState } from "@/lib/actions/quiz";
import { parseQuiz, typeLabel, formatTimeLimit } from "@/lib/quiz";

export function QuizEditor({
  quizId,
  initialWeek,
  initialMarkdown,
  initialDueAt,
  published,
  submissionCount,
}: {
  quizId: string;
  initialWeek: number;
  initialMarkdown: string;
  initialDueAt: string;
  published: boolean;
  submissionCount: number;
}) {
  const [md, setMd] = useState(initialMarkdown);
  const [state, dispatch, pending] = useActionState<QuizFormState, FormData>(saveQuizAction, {});
  const parsed = useMemo(() => parseQuiz(md), [md]);

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={quizId} />
      <input type="hidden" name="markdown" value={md} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/quizzes" className="text-xs text-stone-400 hover:text-stone-600">
              ← 목록
            </Link>
            <span className="font-display text-[17px] font-bold tracking-tight">
              {quizId ? "퀴즈 편집" : "새 퀴즈"}
            </span>
            {published && (
              <span className="rounded-[5px] bg-accent-soft px-2 py-[3px] text-[11px] font-semibold text-accent">
                발행됨
              </span>
            )}
          </div>
          <div className="text-[12.5px] text-stone-400">
            마크다운으로 작성하면 오른쪽에 학습자 화면이 실시간으로 표시됩니다
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            name="publish"
            value=""
            disabled={pending}
            className="cursor-pointer rounded-[9px] border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-stone-600 hover:border-stone-300 disabled:opacity-60"
          >
            저장
          </button>
          <button
            type="submit"
            name="publish"
            value="1"
            disabled={pending}
            className="font-display cursor-pointer rounded-[9px] bg-accent px-5 py-2.5 text-[13.5px] text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {published ? "저장 후 재발행" : "학습자에게 발행"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-line bg-white px-5 py-3.5">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-stone-600">
          주차
          <input
            type="number"
            name="week"
            defaultValue={initialWeek}
            min={1}
            className="w-16 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-stone-600">
          마감
          <input
            type="datetime-local"
            name="dueAt"
            defaultValue={initialDueAt}
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-stone-700"
          />
        </label>
        {submissionCount > 0 && (
          <span className="text-xs text-warn">
            제출 {submissionCount}건 — 문항 구조는 더 이상 변경되지 않습니다
          </span>
        )}
        {state.error && <span className="text-xs font-medium text-bad">{state.error}</span>}
        {state.saved && !state.error && <span className="text-xs text-good">✓ 저장됨</span>}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            className="min-h-[560px] resize-y rounded-xl border border-line bg-white p-[18px] font-mono text-[12.5px] leading-[1.75] text-stone-800"
          />
          <div className="rounded-[10px] bg-line-soft px-4 py-3.5 font-mono text-[11.5px] leading-[1.8] text-stone-500">
            # 제목 · 설명: · 시간: 15분
            <br />
            ## 1. 문항 텍스트 — 선다형
            <br />
            ## 2. [복수] 문항 — 복수 선택
            <br />
            ## 3. [단답] 문항 — 단답형
            <br />
            - (x) 정답 선지 · - ( ) 오답 선지
            <br />
            답: 정답1 | 정답2 (단답 복수 인정)
            <br />
            해설: 정오답 해설
          </div>
          {quizId && submissionCount === 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("이 퀴즈를 삭제할까요?")) deleteQuizAction(quizId);
              }}
              className="cursor-pointer self-start text-xs text-stone-400 hover:text-bad"
            >
              퀴즈 삭제
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-white px-[22px] py-5">
            <span className="text-[11px] font-semibold text-accent">
              미리보기 · {parsed.questions.length}문항 · {formatTimeLimit(parsed.timeLimitSec)}
            </span>
            <span className="text-[16.5px] font-bold tracking-tight">
              {parsed.title || "(제목 없음)"}
            </span>
            <span className="text-[12.5px] text-stone-500">{parsed.description}</span>
          </div>

          {parsed.questions.map((q, qi) => (
            <div
              key={qi}
              className="flex flex-col gap-3 rounded-xl border border-line bg-white px-[22px] py-5"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex-none rounded-md bg-accent-soft px-2 py-[3px] text-[11px] font-bold text-accent">
                  Q{qi + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-semibold text-stone-400">
                    {typeLabel(q.type)}
                  </span>
                  <span className="text-[13.5px] leading-normal font-semibold text-stone-800">
                    {q.text}
                  </span>
                </div>
              </div>
              {q.type !== "SHORT" ? (
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`flex items-center justify-between rounded-[9px] border px-3.5 py-[9px] ${
                        opt.correct ? "border-accent-border bg-accent-soft" : "border-line-soft bg-white"
                      }`}
                    >
                      <span className="text-[12.5px] text-stone-800">{opt.label}</span>
                      {opt.correct && (
                        <span className="text-[11px] font-bold text-accent">✓ 정답</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-paper px-3.5 py-2.5 text-[12.5px] text-stone-700">
                  정답 인정: <b className="text-accent">{q.shortAnswers.join(" | ")}</b>
                </div>
              )}
              {q.explanation && (
                <div className="rounded-lg bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-stone-500">
                  <b className="text-stone-600">해설</b> · {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
