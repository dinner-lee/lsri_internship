// 모둠 자동 구성 알고리즘

export type GroupMethodKey = "BALANCED" | "SIMILAR";

export interface GroupStudent {
  userId: string;
  name: string;
  score: number;
}

// prevGroupOf: userId → 이전 확정 모둠 index
export function makeGroups(
  students: GroupStudent[],
  size: number,
  method: GroupMethodKey,
  avoidPrev: boolean,
  prevGroupOf: Record<string, number> = {}
): GroupStudent[][] {
  const sorted = [...students].sort((a, b) => b.score - a.score);
  const g = Math.max(1, Math.ceil(sorted.length / size));

  // 점수 고르게: 스네이크 배분 (모둠 간 평균 균형)
  const snake = (arr: GroupStudent[]) => {
    const groups: GroupStudent[][] = Array.from({ length: g }, () => []);
    arr.forEach((s, i) => {
      const round = Math.floor(i / g);
      const pos = round % 2 ? g - 1 - (i % g) : i % g;
      groups[pos].push(s);
    });
    return groups;
  };

  // 유사 점수끼리: 점수순 연속 구간
  const chunk = (arr: GroupStudent[]) => {
    const gs: GroupStudent[][] = [];
    for (let i = 0; i < arr.length; i += size) gs.push(arr.slice(i, i + size));
    return gs;
  };

  const build = (arr: GroupStudent[]) => (method === "SIMILAR" ? chunk(arr) : snake(arr));

  if (!avoidPrev) return build(sorted);

  // 이전 모둠 회피: 점수 차 10 이내 인접 학생을 확률적으로 교환하며
  // 기준 방식(build)을 유지한 채 겹침이 최소인 후보를 탐색
  const overlapOf = (groups: GroupStudent[][]) => {
    let n = 0;
    groups.forEach((grp) => {
      for (let i = 0; i < grp.length; i++)
        for (let j = i + 1; j < grp.length; j++) {
          const a = prevGroupOf[grp[i].userId];
          const b = prevGroupOf[grp[j].userId];
          if (a !== undefined && a === b) n++;
        }
    });
    return n;
  };

  let best: GroupStudent[][] | null = null;
  let bestScore = Infinity;
  for (let iter = 0; iter < 300; iter++) {
    const arr = [...sorted];
    for (let i = 0; i < arr.length - 1; i++) {
      if (Math.random() < 0.5 && Math.abs(arr[i].score - arr[i + 1].score) <= 10) {
        const t = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = t;
      }
    }
    const cand = build(arr);
    const ov = overlapOf(cand);
    if (ov < bestScore) {
      bestScore = ov;
      best = cand;
      if (ov === 0) break;
    }
  }
  return best ?? build(sorted);
}

export function overlapPairs(
  group: { userId: string }[],
  prevGroupOf: Record<string, number>
): number {
  let n = 0;
  for (let i = 0; i < group.length; i++)
    for (let j = i + 1; j < group.length; j++) {
      const a = prevGroupOf[group[i].userId];
      const b = prevGroupOf[group[j].userId];
      if (a !== undefined && a === b) n++;
    }
  return n;
}

export const METHOD_LABELS: Record<string, { label: string; sub: string }> = {
  BALANCED: { label: "점수 고르게", sub: "모둠 간 평균이 비슷하게" },
  SIMILAR: { label: "유사 점수끼리", sub: "수준별 모둠 구성" },
  AVOID_PREV: { label: "점수 고르게", sub: "" }, // 레거시 데이터 표시용
};
