// 모둠 자동 구성 알고리즘 (프로토타입 로직 포팅)

export type GroupMethodKey = "BALANCED" | "SIMILAR" | "AVOID_PREV";

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
  prevGroupOf: Record<string, number> = {}
): GroupStudent[][] {
  const sorted = [...students].sort((a, b) => b.score - a.score);
  const g = Math.max(1, Math.ceil(sorted.length / size));

  const snake = (arr: GroupStudent[]) => {
    const groups: GroupStudent[][] = Array.from({ length: g }, () => []);
    arr.forEach((s, i) => {
      const round = Math.floor(i / g);
      const pos = round % 2 ? g - 1 - (i % g) : i % g;
      groups[pos].push(s);
    });
    return groups;
  };

  const chunk = (arr: GroupStudent[]) => {
    const gs: GroupStudent[][] = [];
    for (let i = 0; i < arr.length; i += size) gs.push(arr.slice(i, i + size));
    return gs;
  };

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

  if (method === "SIMILAR") return chunk(sorted);

  if (method === "AVOID_PREV") {
    let best: GroupStudent[][] | null = null;
    let bestScore = Infinity;
    for (let iter = 0; iter < 300; iter++) {
      const arr = [...sorted];
      // 점수 차 10 이내 인접 학생을 확률적으로 교환해 다양한 후보 생성
      for (let i = 0; i < arr.length - 1; i++) {
        if (Math.random() < 0.5 && Math.abs(arr[i].score - arr[i + 1].score) <= 10) {
          const t = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = t;
        }
      }
      const cand = snake(arr);
      const ov = overlapOf(cand);
      if (ov < bestScore) {
        bestScore = ov;
        best = cand;
        if (ov === 0) break;
      }
    }
    return best ?? snake(sorted);
  }

  return snake(sorted); // BALANCED
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

export const METHOD_LABELS: Record<GroupMethodKey, { label: string; sub: string }> = {
  BALANCED: { label: "점수 고르게", sub: "모둠 간 평균이 비슷하게" },
  SIMILAR: { label: "유사 점수끼리", sub: "수준별 모둠 구성" },
  AVOID_PREV: { label: "이전 모둠 회피", sub: "지난 모둠과 겹침 최소화 + 균형" },
};
