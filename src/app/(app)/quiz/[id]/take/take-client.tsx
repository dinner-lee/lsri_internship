"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitQuizAction } from "@/lib/actions/quiz";
import { typeLabel, type AnswerInput } from "@/lib/quiz";
import type { QuestionType } from "@prisma/client";

interface TakeQuestion {
  order: number;
  type: QuestionType;
  text: string;
  options: { order: number; label: string }[];
}

export function TakeQuizClient({
  quizId,
  title,
  timeLimitSec,
  questions,
}: {
  quizId: string;
  title: string;
  timeLimitSec: number | null;
  questions: TakeQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, AnswerInput>>({});
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSec ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const res = await submitQuizAction(quizId, answersRef.current);
    if (res.error) {
      setError(res.error);
      setSubmitting(false);
      submittedRef.current = false;
      return;
    }
    router.push(`/quiz/${quizId}/result`);
  };

  useEffect(() => {
    if (!timeLimitSec) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submit(); // 시간 종료 시 자동 제출
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitSec]);

  const answeredCount = questions.filter((q) => {
    const a = answers[q.order];
    if (!a) return false;
    if (q.type === "SHORT") return (a.text ?? "").trim().length > 0;
    return (a.selectedOptions ?? []).length > 0;
  }).length;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/quiz" className="text-xs text-stone-400 hover:text-stone-600">
            ← 나가기
          </Link>
          <div className="font-display text-lg font-normal tracking-tight">{title}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-stone-400">
            {answeredCount}/{questions.length} 답함
          </span>
          {timeLimitSec ? (
            <div
              className={`rounded-lg border border-line bg-white px-3.5 py-[7px] text-[13px] font-bold tabular-nums ${
                secondsLeft < 60 ? "text-bad" : "text-stone-900"
              }`}
            >
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          ) : null}
        </div>
      </div>

      {questions.map((q) => {
        const a = answers[q.order] ?? {};
        const sel = new Set(a.selectedOptions ?? []);
        return (
          <div
            key={q.order}
            className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[26px] py-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex-none rounded-[7px] bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                Q{q.order + 1}
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
                        setAnswers((prev) => {
                          const cur = new Set(prev[q.order]?.selectedOptions ?? []);
                          if (q.type === "MULTI") {
                            if (cur.has(opt.order)) cur.delete(opt.order);
                            else cur.add(opt.order);
                          } else {
                            cur.clear();
                            cur.add(opt.order);
                          }
                          return { ...prev, [q.order]: { selectedOptions: [...cur] } };
                        });
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
                value={a.text ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.order]: { text: e.target.value } }))
                }
                placeholder="답을 입력하세요"
                className="rounded-[10px] border-[1.5px] border-line bg-paper px-4 py-3 text-[13.5px] text-stone-800"
              />
            )}
          </div>
        );
      })}

      {error && <p className="text-sm font-medium text-bad">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="font-display cursor-pointer rounded-xl bg-accent py-3.5 text-[15px] text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {submitting ? "제출 중…" : "제출하기"}
      </button>
    </div>
  );
}
