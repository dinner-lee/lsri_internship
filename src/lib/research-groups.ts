// 관심 주제 순위(1~5) 기반 자율연구 모둠 구성
//
// 1) 득표 가중치(1순위 5점 … 5순위 1점)가 높은 상위 n개 주제를 앵커로 선정
// 2) 학생을 선호 비용(순위-1, 미선호 7)이 최소가 되도록 정원 내에서 배정
// 3) 쌍끼리 교환해 총비용이 줄어들면 반복 개선 (결정적)

export interface PickInput {
  userId: string;
  topicId: string;
  rank: number; // 1~5
}

export interface ResearchGroupResult {
  topicId: string;
  memberIds: string[];
  rankOf: Record<string, number | null>; // 배정 주제에 대한 각 구성원의 선호 순위
}

const UNRANKED_COST = 7;

export function makeResearchGroups(
  studentIds: string[],
  picks: PickInput[],
  candidateTopicIds: string[],
  groupCount: number
): ResearchGroupResult[] {
  const students = [...studentIds].sort();
  const n = Math.max(1, Math.min(groupCount, candidateTopicIds.length, students.length));

  // 학생별 선호: topicId → rank
  const prefOf = new Map<string, Map<string, number>>();
  students.forEach((s) => prefOf.set(s, new Map()));
  picks.forEach((p) => prefOf.get(p.userId)?.set(p.topicId, p.rank));

  // 앵커 주제 선정: 가중 득표 → 1순위 표 → id 순
  const score = new Map<string, number>();
  const firstVotes = new Map<string, number>();
  candidateTopicIds.forEach((t) => {
    score.set(t, 0);
    firstVotes.set(t, 0);
  });
  picks.forEach((p) => {
    if (!score.has(p.topicId)) return;
    score.set(p.topicId, (score.get(p.topicId) ?? 0) + (6 - p.rank));
    if (p.rank === 1) firstVotes.set(p.topicId, (firstVotes.get(p.topicId) ?? 0) + 1);
  });
  const anchors = [...candidateTopicIds]
    .sort(
      (a, b) =>
        (score.get(b) ?? 0) - (score.get(a) ?? 0) ||
        (firstVotes.get(b) ?? 0) - (firstVotes.get(a) ?? 0) ||
        a.localeCompare(b)
    )
    .slice(0, n);

  // 정원: 크기 차이 최대 1, 남는 자리는 득표 높은 앵커부터
  const base = Math.floor(students.length / n);
  const capacity = anchors.map((_, i) => base + (i < students.length % n ? 1 : 0));

  const costOf = (s: string, anchorIdx: number) => {
    const rank = prefOf.get(s)?.get(anchors[anchorIdx]);
    return rank !== undefined ? rank - 1 : UNRANKED_COST;
  };

  // 탐욕 배정: 선택지가 적은(선호를 적게 낸) 학생부터
  const order = [...students].sort(
    (a, b) =>
      (prefOf.get(a)!.size === 0 ? 1 : 0) - (prefOf.get(b)!.size === 0 ? 1 : 0) ||
      prefOf.get(a)!.size - prefOf.get(b)!.size ||
      a.localeCompare(b)
  );
  const assigned = new Map<string, number>();
  const used = anchors.map(() => 0);
  order.forEach((s) => {
    let best = -1;
    let bestCost = Infinity;
    for (let g = 0; g < n; g++) {
      if (used[g] >= capacity[g]) continue;
      const c = costOf(s, g);
      if (c < bestCost || (c === bestCost && capacity[g] - used[g] > capacity[best] - used[best])) {
        best = g;
        bestCost = c;
      }
    }
    assigned.set(s, best);
    used[best]++;
  });

  // 개선: 두 학생을 맞바꿔 총비용이 줄면 교환
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let i = 0; i < students.length; i++)
      for (let j = i + 1; j < students.length; j++) {
        const a = students[i];
        const b = students[j];
        const ga = assigned.get(a)!;
        const gb = assigned.get(b)!;
        if (ga === gb) continue;
        const now = costOf(a, ga) + costOf(b, gb);
        const swapped = costOf(a, gb) + costOf(b, ga);
        if (swapped < now) {
          assigned.set(a, gb);
          assigned.set(b, ga);
          improved = true;
        }
      }
    if (!improved) break;
  }

  return anchors.map((topicId, g) => {
    const memberIds = students.filter((s) => assigned.get(s) === g);
    const rankOf: Record<string, number | null> = {};
    memberIds.forEach((s) => {
      rankOf[s] = prefOf.get(s)?.get(topicId) ?? null;
    });
    return { topicId, memberIds, rankOf };
  });
}
