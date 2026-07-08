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
  isMe: boolean;
}

export interface NetEdge {
  source: number; // node index
  target: number;
  shared: string[];
}

interface SimNode extends SimulationNodeDatum {
  idx: number;
  r: number;
}

type Hover = { type: "node"; i: number } | { type: "edge"; i: number } | null;

function displayText(node: NetNode) {
  return node.kind === "keyword" ? `#${node.name}` : node.name;
}

// d3-force 레이아웃 — 초기 배치가 결정적(phyllotaxis)이라 새로고침해도 동일
function useLayout(nodes: NetNode[], edges: NetEdge[]) {
  return useMemo(() => {
    const degree = new Array(nodes.length).fill(0);
    edges.forEach((e) => {
      degree[e.source]++;
      degree[e.target]++;
    });

    // 표시 텍스트 전체가 원 안에 들어가도록 반지름을 텍스트 길이 기준으로 결정
    const simNodes: SimNode[] = nodes.map((n, i) => {
      const len = displayText(n).length;
      const r =
        n.kind === "keyword"
          ? Math.min(len, 8) * 4.4 + 6 + Math.min(degree[i] * 1.3, 9)
          : Math.min(len, 6) * 5.6 + 9 + Math.min(degree[i], 4);
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
  caption,
}: {
  nodes: NetNode[];
  edges: NetEdge[];
  caption?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<Hover>(null);
  const { degree, radii, positions: initialPos, box } = useLayout(nodes, edges);
  const [pos, setPos] = useState(initialPos);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ i: number; moved: boolean } | null>(null);

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
    const i = drag.current.i;
    drag.current.moved = true;
    setPos((prev) => prev.map((p, pi) => (pi === i ? [x, y] : p)));
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
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => {
            drag.current = null;
            setHover(null);
          }}
        >
          {/* 엣지 */}
          {edges.map((e, i) => {
            const active =
              (hover?.type === "edge" && hover.i === i) ||
              (hover?.type === "node" && (e.source === hover.i || e.target === hover.i));
            const dimmed = hover !== null && !active;
            return (
              <g key={i}>
                <line
                  x1={pos[e.source][0]}
                  y1={pos[e.source][1]}
                  x2={pos[e.target][0]}
                  y2={pos[e.target][1]}
                  stroke={active ? "var(--color-accent)" : dimmed ? "#eceae7" : "#c9c5bf"}
                  strokeOpacity={active ? 0.55 : 1}
                  strokeWidth={(1 + Math.min(e.shared.length, 3)) * (active ? 1.4 : 1)}
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
                  drag.current = { i, moved: false };
                }}
                onClick={() => {
                  if (isKeyword) return;
                  if (drag.current === null || !drag.current.moved) {
                    router.push(`/topics/${node.id}`);
                  }
                }}
                className={isKeyword ? "cursor-grab" : "cursor-pointer"}
              >
                <circle cx={pos[i][0]} cy={pos[i][1]} r={r + 10} fill="transparent" />
                <circle
                  cx={pos[i][0]}
                  cy={pos[i][1]}
                  r={r}
                  fill={
                    isKeyword
                      ? "var(--color-accent-soft)"
                      : node.isMe
                        ? "#18181b"
                        : "var(--color-accent)"
                  }
                  stroke={isKeyword ? "var(--color-accent-border)" : "#fff"}
                  strokeWidth={isKeyword ? 1.5 : 2}
                />
                {/* 텍스트 전체를 원 안에 표시 (길면 글자 크기 축소) */}
                <text
                  x={pos[i][0]}
                  y={pos[i][1] + 3.5}
                  textAnchor="middle"
                  fontSize={Math.min(isKeyword ? 10 : 11, ((r - 5) * 2) / text.length)}
                  fontWeight={600}
                  fill={isKeyword ? "var(--color-accent)" : "#fff"}
                  pointerEvents="none"
                >
                  {text}
                </text>
              </g>
            );
          })}
        </svg>

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
                  {hoveredNode.keywords.length === 0 && (
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
              {hoveredEdge.shared.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent"
                >
                  #{k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {caption && <div className="text-[11.5px] text-stone-400">{caption}</div>}
    </div>
  );
}
