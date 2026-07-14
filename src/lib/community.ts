// 키워드가 겹치는 학생 그룹(커뮤니티) 탐지 — 가중 라벨 전파(결정적)
// 반환: 노드별 그룹 번호(큰 그룹부터 0, 1, 2…), 연결이 없는 노드는 undefined
export function detectCommunities(
  count: number,
  edges: { source: number; target: number; shared: string[] }[]
): (number | undefined)[] {
  const nbrs: { j: number; w: number }[][] = Array.from({ length: count }, () => []);
  edges.forEach((e) => {
    nbrs[e.source].push({ j: e.target, w: e.shared.length });
    nbrs[e.target].push({ j: e.source, w: e.shared.length });
  });

  const labels = Array.from({ length: count }, (_, i) => i);
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (nbrs[i].length === 0) continue;
      const score = new Map<number, number>();
      nbrs[i].forEach(({ j, w }) => score.set(labels[j], (score.get(labels[j]) ?? 0) + w));
      const top = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      if (top && top[0] !== labels[i] && top[1] > (score.get(labels[i]) ?? 0)) {
        labels[i] = top[0];
        changed = true;
      }
    }
    if (!changed) break;
  }

  const size = new Map<number, number>();
  labels.forEach((l, i) => {
    if (nbrs[i].length > 0) size.set(l, (size.get(l) ?? 0) + 1);
  });
  const renum = new Map(
    [...size.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([l], i) => [l, i])
  );
  return labels.map((l, i) => (nbrs[i].length > 0 ? renum.get(l) : undefined));
}
