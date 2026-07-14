"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";

export interface NetNode {
  id: string; // topicId 또는 kw:키워드
  name: string; // 학생 이름 또는 키워드
  kind?: "student" | "keyword";
  keywords: string[];
  likedKeywords?: string[]; // 하트로 추가한 키워드 (직접 등록과 구분 표시)
  isMe: boolean;
  // 관심사 그룹 소속(비율) — 한 그룹이면 단색, 여러 그룹과 겹치면 그라데이션
  groups?: { group: number; weight: number }[];
  // 겹침 점수 — 클수록 노드가 커짐 (직접 겹침 > 하트 겹침 가중)
  weight?: number;
}

export interface NetEdge {
  source: number; // node index
  target: number;
  shared: string[];
  liked?: string[]; // shared 중 하트(키워드 좋아요)로 추가되어 이어진 키워드
}

// 카드 상호작용(하트·댓글): source 학생이 target 학생의 카드에 남긴 반응
export interface NetInteraction {
  source: number;
  target: number;
  hearts: number;
  comments: number;
}

interface SimNode extends SimulationNodeDatum {
  idx: number;
  r: number;
}

type Hover =
  | { type: "node"; i: number }
  | { type: "edge"; i: number }
  | { type: "inter"; i: number; kind: "heart" | "comment" }
  | null;

const HEART_COLOR = "#cc7d95";
const COMMENT_COLOR = "#b3ada5";

function displayText(node: NetNode) {
  return node.kind === "keyword" ? `#${node.name}` : node.name;
}

// 커뮤니티 색 — 흰 글자가 읽히는 진한 톤으로 통일
const GROUP_COLORS = [
  "#2f4d8f", // 남색
  "#0e7490", // 청록
  "#6d28d9", // 보라
  "#be123c", // 장미
  "#15803d", // 초록
  "#92400e", // 갈색
  "#831843", // 자주
  "#4338ca", // 남보라
];

function groupColor(g: number) {
  return GROUP_COLORS[g % GROUP_COLORS.length];
}

function nodeFill(node: NetNode, i: number) {
  if (node.kind === "keyword") return "var(--color-accent-soft)";
  if (node.isMe) return "#18181b";
  if (!node.groups || node.groups.length === 0) return "var(--color-accent)";
  if (node.groups.length === 1) return groupColor(node.groups[0].group);
  return `url(#node-grad-${i})`; // 여러 그룹과 겹치면 그라데이션
}

// 학생 라벨: "이름 / 학생 / 학과" → 이름(크게) + 소속(작게) 여러 줄
const NAME_FONT = 13;
const SUB_FONT = 9.5;
const NAME_GAP = 15; // 이름 → 첫 소속 줄
const SUB_GAP = 12; // 소속 줄 간격

interface NodeLabel {
  lines: string[];
  fonts: number[];
  offsets: number[]; // 노드 중심 기준 각 줄의 세로 중심
}

function studentLabel(name: string): NodeLabel {
  let lines = name
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    // "이름 / 학생 / 학과"의 '학생' 구분은 생략 (이름 자리는 유지)
    .filter((s, i) => i === 0 || s !== "학생");
  if (lines.length === 0) lines = [name];
  const fonts = lines.map((l, i) =>
    i === 0 ? (lines[0].length > 8 ? 11 : NAME_FONT) : l.length > 10 ? 8.5 : SUB_FONT
  );
  const span = lines.length > 1 ? NAME_GAP + (lines.length - 2) * SUB_GAP : 0;
  const offsets = lines.map((_, i) => (i === 0 ? 0 : NAME_GAP + (i - 1) * SUB_GAP) - span / 2);
  return { lines, fonts, offsets };
}

// 모든 줄이 원 안에 들어가는 최소 반지름
function labelRadius(label: NodeLabel) {
  let r = 0;
  label.lines.forEach((l, i) => {
    const halfW = (l.length * label.fonts[i] * 0.98) / 2;
    const edgeY = Math.abs(label.offsets[i]) + label.fonts[i] * 0.55;
    r = Math.max(r, Math.hypot(halfW, edgeY));
  });
  return Math.max(26, r + 7);
}

// 겹치는 키워드 수 → 선 굵기 (1개 1.5 / 2개 3.7 / 3개 5.9 / 4개 8.1 / 5개+ 10.3)
function edgeWidth(shared: number) {
  return 1.5 + (Math.min(shared, 5) - 1) * 2.2;
}

// d3-force 레이아웃 — 초기 배치가 결정적(phyllotaxis)이라 새로고침해도 동일
function useLayout(nodes: NetNode[], edges: NetEdge[]) {
  return useMemo(() => {
    const degree = new Array(nodes.length).fill(0);
    edges.forEach((e) => {
      degree[e.source]++;
      degree[e.target]++;
    });

    // 표시 텍스트 전체가 원 안에 들어가도록 반지름을 텍스트 기준으로 결정
    // 학생·키워드 노드 모두 겹침/선택 점수(weight)가 클수록 뚜렷하게 커짐
    const simNodes: SimNode[] = nodes.map((n, i) => {
      const r =
        n.kind === "keyword"
          ? Math.min(displayText(n).length, 8) * 4.4 +
            6 +
            (n.weight != null
              ? Math.min(Math.sqrt(n.weight) * 9, 36)
              : Math.min(degree[i] * 1.3, 9))
          : labelRadius(studentLabel(n.name)) +
            (n.weight != null ? Math.min(Math.sqrt(n.weight) * 6.5, 30) : Math.min(degree[i], 4));
      return { idx: i, r };
    });
    const simLinks = edges.map((e) => ({ source: e.source, target: e.target, shared: e.shared }));

    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks)
          .distance((l) => 130 - Math.min((l as { shared: string[] }).shared.length, 3) * 18)
          .strength((l) => 0.3 + 0.15 * Math.min((l as { shared: string[] }).shared.length, 3))
      )
      .force("charge", forceManyBody().strength(-460))
      // 원끼리 겹치지 않게 충돌 방지
      .force("collide", forceCollide<SimNode>().radius((d) => d.r + 14).iterations(2))
      .force("x", forceX(0).strength(0.06))
      .force("y", forceY(0).strength(0.09))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    // 후처리: 엣지가 무관한 노드 아래를 지나면 그 노드를 수직 방향으로 밀어냄
    for (let pass = 0; pass < 40; pass++) {
      let moved = false;
      simLinks.forEach((l) => {
        // forceLink 실행 후에는 source/target이 인덱스가 아닌 노드 객체로 치환됨
        const a = l.source as unknown as SimNode;
        const b = l.target as unknown as SimNode;
        simNodes.forEach((n) => {
          if (n === a || n === b) return;
          const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
          const dx = bx - ax, dy = by - ay;
          const len2 = dx * dx + dy * dy || 1;
          let t = (((n.x ?? 0) - ax) * dx + ((n.y ?? 0) - ay) * dy) / len2;
          t = Math.max(0.08, Math.min(0.92, t));
          const cx = ax + t * dx, cy = ay + t * dy;
          let nx = (n.x ?? 0) - cx, ny = (n.y ?? 0) - cy;
          const dist = Math.hypot(nx, ny);
          const clearance = n.r + 10;
          if (dist >= clearance) return;
          if (dist < 0.5) {
            // 선 위에 정확히 얹힌 경우: 선에 수직인 방향으로 밀기
            const inv = 1 / Math.sqrt(len2);
            nx = -dy * inv;
            ny = dx * inv;
          } else {
            nx /= dist;
            ny /= dist;
          }
          const push = (clearance - dist) * 0.5;
          n.x = (n.x ?? 0) + nx * push;
          n.y = (n.y ?? 0) + ny * push;
          moved = true;
        });
      });
      // 밀어낸 뒤 원끼리 다시 겹치지 않도록 분리
      for (let i = 0; i < simNodes.length; i++)
        for (let j = i + 1; j < simNodes.length; j++) {
          const p = simNodes[i], q = simNodes[j];
          const dx = (q.x ?? 0) - (p.x ?? 0);
          const dy = (q.y ?? 0) - (p.y ?? 0);
          const dist = Math.hypot(dx, dy) || 1;
          const min = p.r + q.r + 12;
          if (dist >= min) continue;
          const push = (min - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          p.x = (p.x ?? 0) - ux * push;
          p.y = (p.y ?? 0) - uy * push;
          q.x = (q.x ?? 0) + ux * push;
          q.y = (q.y ?? 0) + uy * push;
        }
      if (!moved) break;
    }

    // 마커 실제 크기를 포함한 경계로 viewBox 계산 → 잘림 방지
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    simNodes.forEach((d) => {
      const x = d.x ?? 0;
      const y = d.y ?? 0;
      minX = Math.min(minX, x - d.r - 6);
      maxX = Math.max(maxX, x + d.r + 6);
      minY = Math.min(minY, y - d.r - 6);
      maxY = Math.max(maxY, y + d.r + 6);
    });
    const PAD = 18;
    const box = {
      x: minX - PAD,
      y: minY - PAD,
      w: maxX - minX + PAD * 2,
      h: maxY - minY + PAD * 2,
    };

    return {
      degree,
      radii: simNodes.map((d) => d.r),
      positions: simNodes.map((d) => [d.x ?? 0, d.y ?? 0] as [number, number]),
      box,
    };
  }, [nodes, edges]);
}

export function TopicNetwork({
  nodes,
  edges,
  interactions,
  caption,
}: {
  nodes: NetNode[];
  edges: NetEdge[];
  interactions?: NetInteraction[];
  caption?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<Hover>(null);
  const [showInter, setShowInter] = useState(true);
  const { degree, radii, positions: initialPos, box } = useLayout(nodes, edges);
  const [pos, setPos] = useState(initialPos);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ i: number; x: number; y: number; moved: boolean } | null>(null);
  // click은 pointerup 이후에 발생하므로, 드래그 여부를 클릭 시점까지 보존
  const justDragged = useRef(false);

  // 레이아웃이 바뀌면(데이터 변경) 위치 초기화
  const [prevInitial, setPrevInitial] = useState(initialPos);
  if (prevInitial !== initialPos) {
    setPrevInitial(initialPos);
    setPos(initialPos);
  }

  const neighbors = useMemo(() => {
    if (hover?.type !== "node") return null;
    const set = new Set<number>([hover.i]);
    edges.forEach((e) => {
      if (e.source === hover.i) set.add(e.target);
      if (e.target === hover.i) set.add(e.source);
    });
    return set;
  }, [hover, edges]);

  if (nodes.length === 0)
    return (
      <div className="rounded-xl border border-line bg-white p-7 text-[13px] text-stone-400">
        아직 키워드를 설정한 학습자가 없습니다.
      </div>
    );

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return [
      box.x + ((e.clientX - rect.left) / rect.width) * box.w,
      box.y + ((e.clientY - rect.top) / rect.height) * box.h,
    ] as const;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const [x, y] = toSvg(e);
    const d = drag.current;
    // 클릭 시의 미세한 흔들림은 드래그로 치지 않음
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 4) return;
    d.moved = true;
    setPos((prev) => prev.map((p, pi) => (pi === d.i ? [x, y] : p)));
  };

  const releaseDrag = () => {
    justDragged.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  // 툴팁 위치 (컨테이너 % 기준, 경계에서 뒤집기/클램프)
  const tooltipStyle = (x: number, y: number): React.CSSProperties => {
    const px = ((x - box.x) / box.w) * 100;
    const py = ((y - box.y) / box.h) * 100;
    const nearTop = py < 25;
    return {
      left: `${Math.min(80, Math.max(20, px))}%`,
      top: `${py}%`,
      transform: nearTop ? "translate(-50%, 28px)" : "translate(-50%, -120%)",
    };
  };

  // 상호작용 곡선: 하트는 한쪽, 댓글은 반대쪽으로 휘어 서로 겹치지 않음
  const interGeom = (it: NetInteraction, bendSign: number) => {
    const [sx, sy] = pos[it.source];
    const [tx, ty] = pos[it.target];
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * bendSign;
    const ny = (dx / len) * bendSign;
    const bend = Math.min(0.22 * len, 60) + 14;
    const cx = (sx + tx) / 2 + nx * bend;
    const cy = (sy + ty) / 2 + ny * bend;
    // 양 끝을 원 가장자리까지만 — 화살표가 원에 가려지지 않게
    const toward = (x: number, y: number, gap: number) => {
      const d = Math.hypot(cx - x, cy - y) || 1;
      return [x + ((cx - x) / d) * gap, y + ((cy - y) / d) * gap];
    };
    const [ax, ay] = toward(sx, sy, radii[it.source] + 2);
    const [bx, by] = toward(tx, ty, radii[it.target] + 7);
    return {
      d: `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`,
      tipX: 0.25 * ax + 0.5 * cx + 0.25 * bx,
      tipY: 0.25 * ay + 0.5 * cy + 0.25 * by,
    };
  };

  const connectedNames = (i: number) =>
    edges
      .filter((e) => e.source === i || e.target === i)
      .map((e) => nodes[e.source === i ? e.target : e.source])
      .filter((n) => n.kind !== "keyword")
      .map((n) => n.name);

  const hoveredEdge = hover?.type === "edge" ? edges[hover.i] : null;
  const hoveredNode = hover?.type === "node" ? nodes[hover.i] : null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative overflow-hidden rounded-xl border border-line bg-white">
        <svg
          ref={svgRef}
          viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          className="h-auto w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={releaseDrag}
          onPointerLeave={() => {
            releaseDrag();
            setHover(null);
          }}
        >
          {/* 여러 그룹에 걸친 학생: 그룹 색을 비율대로 섞은 대각 그라데이션 */}
          <defs>
            {nodes.map((n, i) => {
              if (!n.groups || n.groups.length < 2 || n.isMe) return null;
              const total = n.groups.reduce((s, g) => s + g.weight, 0) || 1;
              let cum = 0;
              return (
                <linearGradient key={n.id} id={`node-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                  {n.groups.map((g) => {
                    const mid = ((cum + g.weight / 2) / total) * 100;
                    cum += g.weight;
                    return (
                      <stop key={g.group} offset={`${mid}%`} stopColor={groupColor(g.group)} />
                    );
                  })}
                </linearGradient>
              );
            })}
            <marker
              id="arrow-heart"
              viewBox="0 0 8 8"
              refX="6.5"
              refY="4"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto"
            >
              <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill={HEART_COLOR} />
            </marker>
            <marker
              id="arrow-comment"
              viewBox="0 0 8 8"
              refX="6.5"
              refY="4"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto"
            >
              <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill={COMMENT_COLOR} />
            </marker>
          </defs>

          {/* 엣지 */}
          {edges.map((e, i) => {
            const active =
              (hover?.type === "edge" && hover.i === i) ||
              (hover?.type === "node" && (e.source === hover.i || e.target === hover.i));
            const dimmed = hover !== null && !active;
            // 하트로만 이어진 관계는 점선 + 장미색으로 구분
            const likedOnly = (e.liked?.length ?? 0) >= e.shared.length;
            return (
              <g key={i}>
                <line
                  x1={pos[e.source][0]}
                  y1={pos[e.source][1]}
                  x2={pos[e.target][0]}
                  y2={pos[e.target][1]}
                  stroke={
                    active
                      ? likedOnly
                        ? "#be123c"
                        : "var(--color-accent)"
                      : dimmed
                        ? "#eceae7"
                        : likedOnly
                          ? "#dcb2be"
                          : "#c9c5bf"
                  }
                  strokeOpacity={active ? 0.55 : 1}
                  strokeWidth={edgeWidth(e.shared.length) * (active ? 1.3 : 1)}
                  strokeDasharray={likedOnly ? "7 6" : undefined}
                  strokeLinecap="round"
                />
                {/* 넓은 히트 타깃 */}
                <line
                  x1={pos[e.source][0]}
                  y1={pos[e.source][1]}
                  x2={pos[e.target][0]}
                  y2={pos[e.target][1]}
                  stroke="transparent"
                  strokeWidth={14}
                  onMouseEnter={() => setHover({ type: "edge", i })}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* 상호작용 오버레이: 카드에 남긴 하트(장미)·댓글(회색) 곡선 화살표 */}
          {showInter &&
            (interactions ?? []).map((it, i) => {
              const parts: { kind: "heart" | "comment"; count: number; sign: number }[] = [];
              if (it.hearts > 0) parts.push({ kind: "heart", count: it.hearts, sign: 1 });
              if (it.comments > 0) parts.push({ kind: "comment", count: it.comments, sign: -1 });
              return parts.map((p) => {
                const active = hover?.type === "inter" && hover.i === i && hover.kind === p.kind;
                const related =
                  hover?.type === "node" && (it.source === hover.i || it.target === hover.i);
                const dimmed = hover !== null && !active && !related;
                const { d } = interGeom(it, p.sign);
                const color = p.kind === "heart" ? HEART_COLOR : COMMENT_COLOR;
                return (
                  <g key={`inter-${i}-${p.kind}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeOpacity={dimmed ? 0.15 : active || related ? 1 : 0.85}
                      strokeWidth={(1.3 + Math.min(p.count - 1, 3) * 0.5) * (active ? 1.5 : 1)}
                      markerEnd={`url(#arrow-${p.kind})`}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={11}
                      onMouseEnter={() => setHover({ type: "inter", i, kind: p.kind })}
                      onMouseLeave={() => setHover(null)}
                    />
                  </g>
                );
              });
            })}

          {/* 노드 */}
          {nodes.map((node, i) => {
            const dimmed =
              (neighbors !== null && !neighbors.has(i)) ||
              (hoveredEdge !== null && hoveredEdge.source !== i && hoveredEdge.target !== i);
            const r = radii[i];
            const isKeyword = node.kind === "keyword";
            const text = displayText(node);
            return (
              <g
                key={node.id}
                opacity={dimmed ? 0.25 : 1}
                onMouseEnter={() => setHover({ type: "node", i })}
                onMouseLeave={() => setHover(null)}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const [x, y] = toSvg(e);
                  justDragged.current = false;
                  drag.current = { i, x, y, moved: false };
                }}
                onClick={() => {
                  // 드래그해서 놓은 경우에는 이동하지 않음
                  if (isKeyword || justDragged.current || drag.current?.moved) return;
                  router.push(`/topics/${node.id}`);
                }}
                className={isKeyword ? "cursor-grab" : "cursor-pointer"}
              >
                <circle cx={pos[i][0]} cy={pos[i][1]} r={r + 10} fill="transparent" />
                <circle
                  cx={pos[i][0]}
                  cy={pos[i][1]}
                  r={r}
                  fill={nodeFill(node, i)}
                  stroke={isKeyword ? "var(--color-accent-border)" : "#fff"}
                  strokeWidth={isKeyword ? 1.5 : 2}
                />
                {isKeyword ? (
                  <text
                    x={pos[i][0]}
                    y={pos[i][1] + 3.5}
                    textAnchor="middle"
                    fontSize={Math.min(9 + r / 18, ((r - 5) * 2) / text.length)}
                    fontWeight={600}
                    fill="var(--color-accent)"
                    pointerEvents="none"
                  >
                    {text}
                  </text>
                ) : (
                  // 이름(크게) + 소속(작게) 줄바꿈 표시
                  (() => {
                    const label = studentLabel(node.name);
                    return (
                      <text textAnchor="middle" fill="#fff" pointerEvents="none">
                        {label.lines.map((l, li) => (
                          <tspan
                            key={li}
                            x={pos[i][0]}
                            y={pos[i][1] + label.offsets[li] + label.fonts[li] * 0.35}
                            fontSize={label.fonts[li]}
                            fontWeight={li === 0 ? 700 : 500}
                            fillOpacity={li === 0 ? 1 : 0.75}
                          >
                            {l}
                          </tspan>
                        ))}
                      </text>
                    );
                  })()
                )}
              </g>
            );
          })}
        </svg>

        {/* 상호작용 표시 토글 */}
        {(interactions ?? []).length > 0 && (
          <button
            onClick={() => setShowInter((v) => !v)}
            className={`absolute top-2.5 right-2.5 z-10 flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
              showInter
                ? "border-bad-border bg-bad-soft text-bad"
                : "border-line bg-white text-stone-400 hover:border-stone-300"
            }`}
          >
            ♥ 상호작용 {showInter ? "끄기" : "표시"}
          </button>
        )}

        {/* 상호작용 툴팁 */}
        {hover?.type === "inter" &&
          interactions &&
          (() => {
            const it = interactions[hover.i];
            const kind = hover.kind;
            const { tipX, tipY } = interGeom(it, kind === "heart" ? 1 : -1);
            const nameOf = (i: number) => nodes[i].name.split("/")[0].trim();
            return (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-line bg-white px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
                style={tooltipStyle(tipX, tipY)}
              >
                <div className="text-xs font-bold text-stone-800">
                  {nameOf(it.source)} → {nameOf(it.target)}
                </div>
                <div className="mt-1 text-[10.5px] text-stone-500">
                  {kind === "heart"
                    ? `연구 주제 카드에 하트 ♥`
                    : `연구 주제 카드에 댓글 ${it.comments}개`}
                </div>
              </div>
            );
          })()}

        {/* 노드 툴팁 */}
        {hover?.type === "node" && hoveredNode && (
          <div
            className="pointer-events-none absolute z-10 max-w-[260px] rounded-lg border border-line bg-white px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
            style={tooltipStyle(pos[hover.i][0], pos[hover.i][1] - radii[hover.i])}
          >
            <div className="text-xs font-bold text-stone-800">
              {displayText(hoveredNode)}
              {hoveredNode.isMe ? " (나)" : ""}
            </div>
            {hoveredNode.kind === "keyword" ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {connectedNames(hover.i).map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-line-soft px-2 py-0.5 text-[10.5px] font-medium text-stone-600"
                  >
                    {n}
                  </span>
                ))}
                <span className="w-full text-[10.5px] text-stone-400">
                  {degree[hover.i]}명이 선택한 키워드
                </span>
              </div>
            ) : (
              <>
                <div className="mt-1 flex flex-wrap gap-1">
                  {hoveredNode.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-line-soft px-2 py-0.5 text-[10.5px] font-medium text-stone-600"
                    >
                      #{k}
                    </span>
                  ))}
                  {(hoveredNode.likedKeywords ?? []).map((k) => (
                    <span
                      key={`liked-${k}`}
                      className="rounded-full bg-bad-soft px-2 py-0.5 text-[10.5px] font-medium text-bad"
                    >
                      ♥ #{k}
                    </span>
                  ))}
                  {hoveredNode.keywords.length === 0 &&
                    (hoveredNode.likedKeywords ?? []).length === 0 && (
                      <span className="text-[10.5px] text-stone-400">키워드 없음</span>
                    )}
                </div>
                {degree[hover.i] > 0 && (
                  <div className="mt-1 text-[10.5px] text-stone-400">
                    {nodes.some((n) => n.kind === "keyword")
                      ? `키워드 ${degree[hover.i]}개 선택`
                      : `${degree[hover.i]}명과 관심사가 겹칩니다`}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 엣지 툴팁: 공유 키워드 */}
        {hoveredEdge && (
          <div
            className="pointer-events-none absolute z-10 max-w-[260px] rounded-lg border border-line bg-white px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
            style={tooltipStyle(
              (pos[hoveredEdge.source][0] + pos[hoveredEdge.target][0]) / 2,
              (pos[hoveredEdge.source][1] + pos[hoveredEdge.target][1]) / 2
            )}
          >
            <div className="text-xs font-bold text-stone-800">
              {displayText(nodes[hoveredEdge.source])} ↔ {displayText(nodes[hoveredEdge.target])}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {hoveredEdge.shared.map((k) => {
                const viaLike = hoveredEdge.liked?.includes(k);
                return (
                  <span
                    key={k}
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                      viaLike ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {viaLike ? "♥ " : ""}#{k}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {caption && <div className="text-[11.5px] text-stone-400">{caption}</div>}
    </div>
  );
}
