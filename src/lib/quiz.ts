// 마크다운 퀴즈 파서 · 채점 (프로토타입 문법과 동일)
//
// # 제목 · 설명: · 시간: 15분
// ## 1. 문항 텍스트 — 선다형
// ## 2. [복수] 문항 — 복수 선택
// ## 3. [단답] 문항 — 단답형
// - (x) 정답 선지 · - ( ) 오답 선지
// 답: 정답1 | 정답2 (단답 복수 인정)
// 해설: 정오답 해설

export type ParsedQuestionType = "SINGLE" | "MULTI" | "SHORT";

export interface ParsedQuestion {
  type: ParsedQuestionType;
  text: string;
  options: { label: string; correct: boolean }[];
  shortAnswers: string[];
  explanation: string;
}

export interface ParsedQuiz {
  title: string;
  description: string;
  timeLimitSec: number | null;
  questions: ParsedQuestion[];
}

export function parseQuiz(md: string): ParsedQuiz {
  const quiz: ParsedQuiz = { title: "", description: "", timeLimitSec: null, questions: [] };
  let cur: ParsedQuestion | null = null;
  const push = () => {
    if (cur && (cur.options.length || cur.shortAnswers.length)) quiz.questions.push(cur);
    cur = null;
  };
  (md || "").split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("## ")) {
      push();
      let t = line.slice(3).replace(/^\d+[.)]\s*/, "");
      let type: ParsedQuestionType = "SINGLE";
      if (t.includes("[복수]")) {
        type = "MULTI";
        t = t.replace("[복수]", "").trim();
      }
      if (t.includes("[단답]")) {
        type = "SHORT";
        t = t.replace("[단답]", "").trim();
      }
      cur = { type, text: t, options: [], shortAnswers: [], explanation: "" };
    } else if (line.startsWith("# ")) {
      quiz.title = line.slice(2).trim();
    } else if (line.startsWith("설명:")) {
      quiz.description = line.slice(3).trim();
    } else if (line.startsWith("시간:")) {
      const m = line.slice(3).match(/(\d+)/);
      quiz.timeLimitSec = m ? parseInt(m[1], 10) * 60 : null;
    } else if (/^- \((x|X| )\)/.test(line) && cur) {
      cur.options.push({
        label: line.replace(/^- \((x|X| )\)\s*/, ""),
        correct: /^- \((x|X)\)/.test(line),
      });
    } else if (line.startsWith("답:") && cur) {
      cur.shortAnswers = line
        .slice(2)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      cur.type = "SHORT";
    } else if (line.startsWith("해설:") && cur) {
      cur.explanation = line.slice(3).trim();
    }
  });
  push();
  quiz.questions.forEach((q) => {
    if (q.type !== "SHORT" && q.options.filter((o) => o.correct).length > 1) q.type = "MULTI";
  });
  return quiz;
}

export function typeLabel(t: ParsedQuestionType) {
  return t === "MULTI" ? "복수 선택" : t === "SHORT" ? "단답형" : "선다형";
}

export interface AnswerInput {
  selectedOptions?: number[]; // 선지 order 목록
  text?: string;
}

export interface GradableQuestion {
  type: ParsedQuestionType;
  shortAnswers: string[];
  options: { order: number; isCorrect: boolean }[];
}

export function gradeQuestion(q: GradableQuestion, a: AnswerInput | undefined): boolean {
  if (!a) return false;
  if (q.type === "SHORT") {
    const norm = (s: string) => (s || "").replace(/\s+/g, "").toLowerCase();
    return q.shortAnswers.some((ans) => norm(ans) === norm(a.text ?? ""));
  }
  const sel = new Set(a.selectedOptions ?? []);
  if (q.type === "MULTI") {
    return q.options.every((o) => sel.has(o.order) === o.isCorrect);
  }
  if (sel.size !== 1) return false;
  const picked = [...sel][0];
  return q.options.some((o) => o.order === picked && o.isCorrect);
}

export function formatTimeLimit(sec: number | null | undefined) {
  return sec ? `${Math.round(sec / 60)}분` : "제한 없음";
}
