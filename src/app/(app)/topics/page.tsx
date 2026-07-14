import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf, normKeyword, topicTitleOf } from "@/lib/utils";
import { TopicPickControl } from "./topic-pick";
import { KeywordCloud } from "./keyword-cloud";
import {
  TopicNetwork,
  type NetEdge,
  type NetNode,
  type NetInteraction,
} from "@/components/topic-network";
import { UserAvatar } from "@/components/user-menu";
import { detectCommunities } from "@/lib/community";
import { CompassIcon } from "@/components/icons";

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode = view === "network" ? "network" : view === "keywords" ? "keywords" : "cards";
  const user = await requireUser();

  // 왕복 지연을 줄이기 위해 병렬 실행
  const [topics, allTopics, keywordLikes, allNetTopics, cardLikes, cardComments] =
    await Promise.all([
      prisma.topic.findMany({
        where: { markdown: { not: "" }, userId: { not: user.id } },
        include: {
          user: true,
          likes: { include: { user: { select: { name: true, image: true } } } },
          comments: { select: { userId: true, user: { select: { name: true, image: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      // 키워드 지도: 사용 수 + 좋아요 수
      prisma.topic.findMany({ select: { keywords: true } }),
      prisma.keywordLike.findMany(),
      // 네트워크: 나를 포함해 주제/키워드를 등록했거나 키워드에 하트를 누른 전원
      prisma.topic.findMany({
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      // 상호작용 오버레이: 누가 누구의 카드에 하트/댓글을 남겼는지
      prisma.topicLike.findMany({
        select: { userId: true, topic: { select: { userId: true } } },
      }),
      prisma.comment.findMany({
        select: { userId: true, topic: { select: { userId: true } } },
      }),
    ]);

  // 자율연구: 내 관심 순위 + 확정된 연구 모둠
  const [myPicks, researchSet] = await Promise.all([
    prisma.topicPick.findMany({ where: { userId: user.id } }),
    prisma.researchGroupSet.findFirst({
      where: { confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: {
        groups: {
          orderBy: { index: "asc" },
          include: {
            topic: { include: { user: true } },
            members: { include: { user: true } },
          },
        },
      },
    }),
  ]);
  const myRankOf = new Map(myPicks.map((p) => [p.topicId, p.rank]));
  const myResearchGroup = researchSet?.groups.find((g) =>
    g.members.some((m) => m.userId === user.id)
  );
  // 표기가 달라도(공백·대소문자) 같은 키워드로 합치기 — 가장 많이 쓰인 표기를 대표로
  const formCount = new Map<string, Map<string, number>>();
  const addForm = (raw: string) => {
    const key = normKeyword(raw);
    if (!key) return;
    if (!formCount.has(key)) formCount.set(key, new Map());
    const m = formCount.get(key)!;
    m.set(raw.trim(), (m.get(raw.trim()) ?? 0) + 1);
  };
  allTopics.forEach((t) => t.keywords.forEach(addForm));
  keywordLikes.forEach((kl) => addForm(kl.keyword));
  const canon = new Map<string, string>();
  formCount.forEach((m, key) => {
    canon.set(key, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  });
  const canonOf = (raw: string) => canon.get(normKeyword(raw)) ?? raw;

  const usage = new Map<string, number>();
  allTopics.forEach((t) =>
    new Set(t.keywords.map(canonOf)).forEach((k) => usage.set(k, (usage.get(k) ?? 0) + 1))
  );
  const likeCount = new Map<string, number>();
  const myLiked = new Set<string>();
  keywordLikes.forEach((kl) => {
    const k = canonOf(kl.keyword);
    if (!usage.has(k)) usage.set(k, 0);
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
    if (kl.userId === user.id) myLiked.add(k);
  });
  const cloud = [...usage.keys()]
    .map((k) => ({
      keyword: k,
      count: (usage.get(k) ?? 0) + (likeCount.get(k) ?? 0),
      liked: myLiked.has(k),
    }))
    .sort((a, b) => b.count - a.count);

  // 주제·키워드·하트 중 하나라도 있는 학습자만 노드로 표시
  const likedUserIds = new Set(keywordLikes.map((kl) => kl.userId));
  const netTopics = allNetTopics.filter(
    (t) => t.markdown !== "" || t.keywords.length > 0 || likedUserIds.has(t.userId)
  );

  // 직접 등록한 키워드 / 하트로 추가한 키워드 (모두 대표 표기로 정규화)
  const directOf = new Map<string, string[]>();
  const likedOf = new Map<string, string[]>();
  netTopics.forEach((t) => {
    const ownNorm = new Set(t.keywords.map(normKeyword));
    directOf.set(t.userId, [...new Set(t.keywords.map(canonOf))]);
    likedOf.set(t.userId, [
      ...new Set(
        keywordLikes
          .filter((kl) => kl.userId === t.userId && !ownNorm.has(normKeyword(kl.keyword)))
          .map((kl) => canonOf(kl.keyword))
      ),
    ]);
  });

  // 학생 네트워크: 키워드(직접 + 하트)가 겹치는 학생끼리 연결
  const edges: NetEdge[] = [];
  for (let i = 0; i < netTopics.length; i++)
    for (let j = i + 1; j < netTopics.length; j++) {
      const aLiked = likedOf.get(netTopics[i].userId) ?? [];
      const bLiked = likedOf.get(netTopics[j].userId) ?? [];
      const bDirect = directOf.get(netTopics[j].userId) ?? [];
      const aAll = [...(directOf.get(netTopics[i].userId) ?? []), ...aLiked];
      const shared = aAll.filter((k) => bDirect.includes(k) || bLiked.includes(k));
      if (shared.length === 0) continue;
      // 어느 한쪽이라도 하트로 갖게 된 키워드는 '하트 연결'로 표시
      const liked = shared.filter((k) => aLiked.includes(k) || bLiked.includes(k));
      edges.push({ source: i, target: j, shared, liked });
    }

  // 겹침 점수: 직접 키워드 겹침 1.0, 하트로 인한 겹침 0.4 — 노드 크기에 반영
  const overlapScore = new Array(netTopics.length).fill(0);
  edges.forEach((e) => {
    const s = e.shared.reduce((acc, k) => acc + (e.liked?.includes(k) ? 0.4 : 1), 0);
    overlapScore[e.source] += s;
    overlapScore[e.target] += s;
  });

  // 연결된 학생끼리 비슷한 색을 갖도록 커뮤니티 계산 + 그룹별 연결 비중(그라데이션용)
  const community = detectCommunities(netTopics.length, edges);
  const groupWeights: Map<number, number>[] = netTopics.map(() => new Map());
  edges.forEach((e) => {
    const w = e.shared.length;
    const cs = community[e.source];
    const ct = community[e.target];
    if (ct !== undefined) groupWeights[e.source].set(ct, (groupWeights[e.source].get(ct) ?? 0) + w);
    if (cs !== undefined) groupWeights[e.target].set(cs, (groupWeights[e.target].get(cs) ?? 0) + w);
  });
  const groupsOf = (i: number) => {
    const entries = [...groupWeights[i].entries()]
      .map(([group, weight]) => ({ group, weight }))
      .sort((a, b) => b.weight - a.weight || a.group - b.group);
    const total = entries.reduce((s, g) => s + g.weight, 0);
    // 비중 15% 미만의 그룹은 생략, 최대 3색
    const kept = entries.filter((g) => g.weight / total >= 0.15).slice(0, 3);
    return kept.length > 0 ? kept : undefined;
  };

  const studentNodes: NetNode[] = netTopics.map((t, i) => ({
    id: t.id,
    name: t.user.name,
    kind: "student",
    keywords: directOf.get(t.userId) ?? [],
    likedKeywords: likedOf.get(t.userId) ?? [],
    isMe: t.userId === user.id,
    groups: groupsOf(i),
    weight: overlapScore[i],
  }));

  // 상호작용 오버레이: A→B 카드 하트/댓글을 방향 있는 곡선으로
  const userIdx = new Map(netTopics.map((t, i) => [t.userId, i]));
  const interMap = new Map<string, NetInteraction>();
  const addInter = (fromU: string, toU: string, kind: "hearts" | "comments") => {
    const s = userIdx.get(fromU);
    const t = userIdx.get(toU);
    if (s === undefined || t === undefined || s === t) return;
    const key = `${s}-${t}`;
    if (!interMap.has(key)) interMap.set(key, { source: s, target: t, hearts: 0, comments: 0 });
    interMap.get(key)![kind] += 1;
  };
  cardLikes.forEach((l) => addInter(l.userId, l.topic.userId, "hearts"));
  cardComments.forEach((c) => addInter(c.userId, c.topic.userId, "comments"));
  const interactions = [...interMap.values()];

  // 키워드 그래프(이분): 학생 ↔ 키워드 (하트로 추가한 키워드는 점선, 그룹 색은 미적용)
  const kwList = [
    ...new Set(
      netTopics.flatMap((t) => [
        ...(directOf.get(t.userId) ?? []),
        ...(likedOf.get(t.userId) ?? []),
      ])
    ),
  ];
  const kwIndex = new Map(kwList.map((k, i) => [k, netTopics.length + i]));
  // 키워드 선택 점수: 직접 등록 1.0, 하트 0.4 — 키워드 노드 크기에 반영
  const kwScore = new Map<string, number>();
  netTopics.forEach((t) => {
    (directOf.get(t.userId) ?? []).forEach((k) => kwScore.set(k, (kwScore.get(k) ?? 0) + 1));
    (likedOf.get(t.userId) ?? []).forEach((k) => kwScore.set(k, (kwScore.get(k) ?? 0) + 0.4));
  });
  const bipNodes: NetNode[] = [
    // 키워드 그래프에서는 그룹 색·겹침 크기 강조를 적용하지 않음
    ...studentNodes.map((n) => ({ ...n, groups: undefined, weight: undefined })),
    ...kwList.map((k) => ({
      id: `kw:${k}`,
      name: k,
      kind: "keyword" as const,
      keywords: [],
      isMe: false,
      weight: kwScore.get(k) ?? 0,
    })),
  ];
  const bipEdges: NetEdge[] = [];
  netTopics.forEach((t, i) => {
    (directOf.get(t.userId) ?? []).forEach((k) =>
      bipEdges.push({ source: i, target: kwIndex.get(k)!, shared: [k] })
    );
    (likedOf.get(t.userId) ?? []).forEach((k) =>
      bipEdges.push({ source: i, target: kwIndex.get(k)!, shared: [k], liked: [k] })
    );
  });

  const viewTabs = [
    { href: "/topics", label: "카드", active: mode === "cards" },
    { href: "/topics?view=network", label: "학생 네트워크", active: mode === "network" },
    { href: "/topics?view=keywords", label: "키워드 그래프", active: mode === "keywords" },
  ];

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-display text-[16px] text-stone-600">
          <CompassIcon />
          동료 주제 탐색
          {user.role === "LEARNER" && (
            <span className="group relative inline-flex items-center">
              <span className="flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-stone-300 font-sans text-[10px] font-semibold text-stone-400 group-hover:border-stone-400 group-hover:text-stone-600">
                i
              </span>
              <span className="invisible absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[300px] -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 font-sans text-[11.5px] font-normal text-stone-600 opacity-0 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
                내 주제는 우측 상단 프로필 메뉴에서 설정합니다 · 카드의 관심 순위(1~5)는
                자율연구 모둠 구성에 활용됩니다
              </span>
            </span>
          )}
          {mode !== "cards" && (
            <span className="ml-0.5 text-[12.5px] text-stone-400">
              {mode === "network" ? "— 관심 키워드가 겹치는 학생 네트워크" : "— 학생과 키워드의 연결"}
            </span>
          )}
        </div>
        <div className="flex rounded-[9px] bg-line-soft p-[3px]">
          {viewTabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`font-display rounded-[7px] px-3.5 py-1.5 text-[12.5px] ${
                t.active ? "bg-white text-stone-900 shadow-sm" : "text-stone-400"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {mode === "network" && (
        <TopicNetwork
          nodes={studentNodes}
          edges={edges}
          interactions={interactions}
          caption="같은 관심 키워드를 가진 학습자끼리 연결됩니다 · 검은 원이 나, 원 색이 같으면 관심사가 비슷한 그룹이고 여러 그룹과 겹치는 학습자는 그라데이션으로 표시됩니다 · 선이 굵을수록 겹치는 키워드가 많고, 하트로 추가한 키워드로 이어진 관계는 점선입니다 · 가는 곡선 화살표는 카드에 남긴 하트(장미)·댓글(회색)이며 우측 상단에서 켜고 끌 수 있습니다 · 원은 드래그로 옮기고, 클릭하면 해당 연구 주제로 이동합니다"
        />
      )}

      {mode === "keywords" && (
        <TopicNetwork
          nodes={bipNodes}
          edges={bipEdges}
          caption="학습자(원)와 관심 키워드(옅은 원)가 연결된 그래프입니다 · 검은 원이 나입니다 · 키워드 원이 클수록 여러 학습자가 선택한 키워드이고, 하트로 추가한 키워드는 점선으로 연결됩니다 · 원은 드래그로 옮기고, 학습자를 클릭하면 해당 연구 주제로 이동합니다"
        />
      )}

      {mode === "cards" && (
        <>
          {/* 확정된 자율연구 모둠 (내 모둠) */}
          {myResearchGroup && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white px-5 py-4 sm:px-7">
              <span className="self-start rounded-[5px] bg-accent-soft px-2 py-[3px] text-[10.5px] font-bold text-accent">
                내 자율연구 모둠
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14.5px] font-bold tracking-tight">
                    <span className="text-accent">모둠 {myResearchGroup.index + 1}</span> ·{" "}
                    {topicTitleOf(myResearchGroup.topic.markdown)}
                  </span>
                  <span className="text-[11.5px] text-stone-400">
                    주제 작성: {myResearchGroup.topic.user.name.split("/")[0].trim()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {myResearchGroup.members.map((m) => (
                    <span
                      key={m.id}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                        m.userId === user.id
                          ? "bg-accent-soft text-accent"
                          : "bg-paper text-stone-600"
                      }`}
                    >
                      {m.user.name.split("/")[0].trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white px-5 py-[18px]">
            <div className="flex items-center gap-1.5 font-display text-[13px] text-stone-600">
              관심 키워드 지도
              <span className="group relative inline-flex items-center">
                <span className="flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-stone-300 font-sans text-[10px] font-semibold text-stone-400 group-hover:border-stone-400 group-hover:text-stone-600">
                  i
                </span>
                <span className="invisible absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[300px] -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 font-sans text-[11.5px] font-normal text-stone-600 opacity-0 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
                  하트를 누르면 내 관심 키워드에 추가되어 네트워크와 내 카드에 ♥ 키워드로
                  표시됩니다
                </span>
              </span>
            </div>
            <KeywordCloud items={cloud} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {topics.length === 0 && (
              <div className="text-[13px] text-stone-400">아직 작성된 동료 주제가 없습니다.</div>
            )}
            {topics.map((t) => {
              const liked = t.likes.some((l) => l.userId === user.id);
              // 반응한 사람(작성자 본인 제외, 중복 없이)
              const reactorMap = new Map<string, { name: string; image: string | null }>();
              t.likes.forEach((l) => {
                if (l.userId !== t.userId) reactorMap.set(l.userId, l.user);
              });
              t.comments.forEach((c) => {
                if (c.userId !== t.userId) reactorMap.set(c.userId, c.user);
              });
              const reactors = [...reactorMap.entries()].map(([key, u]) => ({ key, ...u }));
              const ownNorm = new Set(t.keywords.map(normKeyword));
              const heartedKeywords = [
                ...new Set(
                  keywordLikes
                    .filter(
                      (kl) => kl.userId === t.userId && !ownNorm.has(normKeyword(kl.keyword))
                    )
                    .map((kl) => canonOf(kl.keyword))
                ),
              ];
              const excerpt = t.markdown
                .split("\n")
                .filter((l) => l.trim() && !l.trim().startsWith("#"))
                .join(" ")
                .slice(0, 80);
              const title =
                t.markdown
                  .split("\n")
                  .find((l) => l.trim().startsWith("#"))
                  ?.replace(/^#+\s*/, "") ?? "(제목 없음)";
              return (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-5 hover:border-accent-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-line text-[11px] font-semibold text-stone-600">
                      {initialOf(t.user.name)}
                    </div>
                    <span className="text-[12.5px] font-semibold">{t.user.name}</span>
                  </div>
                  <div className="text-[14.5px] leading-snug font-bold tracking-tight">{title}</div>
                  <div className="line-clamp-2 text-[12.5px] leading-relaxed text-stone-500">
                    {excerpt}
                  </div>
                  {(t.keywords.length > 0 || heartedKeywords.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {t.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-line-soft px-2 py-[3px] text-[11px] font-medium text-stone-600"
                        >
                          #{k}
                        </span>
                      ))}
                      {/* 키워드 지도에서 하트로 추가한 키워드 */}
                      {heartedKeywords.map((k) => (
                        <span
                          key={`liked-${k}`}
                          className="rounded-full bg-bad-soft px-2 py-[3px] text-[11px] font-medium text-bad"
                        >
                          ♥ #{k}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 자율연구 모둠 구성용 관심 순위 (학습자만) */}
                  {user.role === "LEARNER" && (
                    <TopicPickControl topicId={t.id} rank={myRankOf.get(t.id) ?? null} />
                  )}
                  <div className="flex items-center justify-between border-t border-line-soft pt-2.5">
                    <div
                      className={`flex gap-3.5 text-xs ${liked ? "text-bad" : "text-stone-400"}`}
                    >
                      <span>
                        {liked ? "♥" : "♡"} {t.likes.length}
                      </span>
                      <span className="text-stone-400">💬 {t._count.comments}</span>
                    </div>
                    {/* 반응한 사람(하트·댓글) 아바타 */}
                    {reactors.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {reactors.slice(0, 5).map((r) => (
                          <span
                            key={r.key}
                            title={r.name}
                            className="rounded-full border-2 border-white"
                          >
                            <UserAvatar name={r.name} image={r.image} size={18} />
                          </span>
                        ))}
                        {reactors.length > 5 && (
                          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white bg-line-soft text-[9px] font-semibold text-stone-500">
                            +{reactors.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
