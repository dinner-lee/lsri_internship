// 관심 주제 순위(1~5) 기반 자율연구 모둠 구성
//
// - 주제 작성자는 자기 주제에 암묵적 0순위(최우선)로 취급
// - 비용을 볼록하게(3순위 이하·미선호에 큰 페널티) 두어 소수의 완벽한 배정보다
//   다수가 1~2순위 안에 들어가는 배정을 선호
// - 앵커 주제도 가중 득표 상위에서 시작해, 총 배정 비용이 줄어드는 방향으로
//   교체 탐색(결정적)

export interface PickInput {
  userId: string;
  topicId: string;
  rank: number; // 0(작성자 본인) ~ 5
}

export interface ResearchGroupResult {
  topicId: string;
  memberIds: string[];
  rankOf: Record<string, number | null>; // 0 = 본인 주제, null = 선호 목록에 없음
}

const COST_BY_RANK: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 5, 4: 9, 5: 14 };
const UNRANKED_COST = 30;

export function makeResearchGroups(
  studentIds: string[],
  picks: PickInput[],
  candidateTopicIds: string[],
  groupCount: number
): ResearchGroupResult[] {
  const students = [...studentIds].sort();
  const n = Math.max(1, Math.min(groupCount, candidateTopicIds.length, students.length));

  // 학생별 선호: topicId → rank (0 = 본인 주제)
  const prefOf = new Map<string, Map<string, number>>();
  students.forEach((s) => prefOf.set(s, new Map()));
  picks.forEach((p) => prefOf.get(p.userId)?.set(p.topicId, p.rank));

  const costOf = (s: string, topicId: string) => {
    const rank = prefOf.get(s)?.get(topicId);
    return rank !== undefined ? COST_BY_RANK[rank] : UNRANKED_COST;
  };

  // 주어진 앵커 조합에 대해 정원 내 최소 비용 배정 (탐욕 + 쌍 교환 개선)
  const assign = (anchors: string[]) => {
    const base = Math.floor(students.length / anchors.length);
    const capacity = anchors.map((_, i) => base + (i < students.length % anchors.length ? 1 : 0));

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
      for (let g = 0; g < anchors.length; g++) {
        if (used[g] >= capacity[g]) continue;
        const c = costOf(s, anchors[g]);
        if (
          c < bestCost ||
          (c === bestCost && capacity[g] - used[g] > capacity[best] - used[best])
        ) {
          best = g;
          bestCost = c;
        }
      }
      assigned.set(s, best);
      used[best]++;
    });

    for (let pass = 0; pass < 8; pass++) {
      let improved = false;
      for (let i = 0; i < students.length; i++)
        for (let j = i + 1; j < students.length; j++) {
          const a = students[i];
          const b = students[j];
          const ga = assigned.get(a)!;
          const gb = assigned.get(b)!;
          if (ga === gb) continue;
          const now = costOf(a, anchors[ga]) + costOf(b, anchors[gb]);
          const swapped = costOf(a, anchors[gb]) + costOf(b, anchors[ga]);
          if (swapped < now) {
            assigned.set(a, gb);
            assigned.set(b, ga);
            improved = true;
          }
        }
      if (!improved) break;
    }

    let total = 0;
    assigned.forEach((g, s) => (total += costOf(s, anchors[g])));
    return { assigned, total };
  };

  // 초기 앵커: 가중 득표(1순위 5점 … 5순위 1점, 본인 0순위 제외) 상위 n개
  const score = new Map<string, number>();
  const firstVotes = new Map<string, number>();
  candidateTopicIds.forEach((t) => {
    score.set(t, 0);
    firstVotes.set(t, 0);
  });
  picks.forEach((p) => {
    if (!score.has(p.topicId) || p.rank < 1) return;
    score.set(p.topicId, (score.get(p.topicId) ?? 0) + (6 - p.rank));
    if (p.rank === 1) firstVotes.set(p.topicId, (firstVotes.get(p.topicId) ?? 0) + 1);
  });
  const ranked = [...candidateTopicIds].sort(
    (a, b) =>
      (score.get(b) ?? 0) - (score.get(a) ?? 0) ||
      (firstVotes.get(b) ?? 0) - (firstVotes.get(a) ?? 0) ||
      a.localeCompare(b)
  );
  let anchors = ranked.slice(0, n);
  let best = assign(anchors);

  // 앵커 교체 탐색: 앵커 하나를 후보로 바꿔 총비용이 줄면 채택
  const pool = ranked.slice(0, Math.min(ranked.length, n + 12)); // 상위권 후보만
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (let i = 0; i < anchors.length; i++) {
      for (const cand of pool) {
        if (anchors.includes(cand)) continue;
        const trial = anchors.map((a, ai) => (ai === i ? cand : a));
        const res = assign(trial);
        if (res.total < best.total) {
          anchors = trial;
          best = res;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // 앵커를 득표순으로 정렬해 모둠 번호 부여
  const anchorOrder = [...anchors].sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b));
  const idxOf = new Map(anchors.map((a, i) => [a, i]));
  return anchorOrder.map((topicId) => {
    const g = idxOf.get(topicId)!;
    const memberIds = students.filter((s) => best.assigned.get(s) === g);
    const rankOf: Record<string, number | null> = {};
    memberIds.forEach((s) => {
      rankOf[s] = prefOf.get(s)?.get(topicId) ?? null;
    });
    return { topicId, memberIds, rankOf };
  });
}
