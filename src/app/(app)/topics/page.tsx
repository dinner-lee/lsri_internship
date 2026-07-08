import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { initialOf } from "@/lib/utils";
import { KeywordCloud } from "./keyword-cloud";
import { TopicNetwork, type NetEdge, type NetNode } from "@/components/topic-network";

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode = view === "network" ? "network" : view === "keywords" ? "keywords" : "cards";
  const user = await requireUser();

  const topics = await prisma.topic.findMany({
    where: { markdown: { not: "" }, userId: { not: user.id } },
    include: {
      user: true,
      likes: true,
      _count: { select: { comments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 키워드 지도: 사용 수 + 좋아요 수
  const allTopics = await prisma.topic.findMany({ select: { keywords: true } });
  const keywordLikes = await prisma.keywordLike.findMany();
  const usage = new Map<string, number>();
  allTopics.forEach((t) => t.keywords.forEach((k) => usage.set(k, (usage.get(k) ?? 0) + 1)));
  keywordLikes.forEach((kl) => {
    if (!usage.has(kl.keyword)) usage.set(kl.keyword, 0);
  });
  const likeCount = new Map<string, number>();
  const myLiked = new Set<string>();
  keywordLikes.forEach((kl) => {
    likeCount.set(kl.keyword, (likeCount.get(kl.keyword) ?? 0) + 1);
    if (kl.userId === user.id) myLiked.add(kl.keyword);
  });
  const cloud = [...usage.keys()]
    .map((k) => ({
      keyword: k,
      count: (usage.get(k) ?? 0) + (likeCount.get(k) ?? 0),
      liked: myLiked.has(k),
    }))
    .sort((a, b) => b.count - a.count);

  // 네트워크: 나를 포함해 주제/키워드를 등록한 전원
  const netTopics = await prisma.topic.findMany({
    where: { OR: [{ markdown: { not: "" } }, { NOT: { keywords: { isEmpty: true } } }] },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const studentNodes: NetNode[] = netTopics.map((t) => ({
    id: t.id,
    name: t.user.name,
    kind: "student",
    keywords: t.keywords,
    isMe: t.userId === user.id,
  }));

  // 학생 네트워크: 키워드가 겹치는 학생끼리 연결
  const edges: NetEdge[] = [];
  for (let i = 0; i < netTopics.length; i++)
    for (let j = i + 1; j < netTopics.length; j++) {
      const shared = netTopics[i].keywords.filter((k) => netTopics[j].keywords.includes(k));
      if (shared.length > 0) edges.push({ source: i, target: j, shared });
    }

  // 키워드 그래프(이분): 학생 ↔ 키워드
  const kwList = [...new Set(netTopics.flatMap((t) => t.keywords))];
  const bipNodes: NetNode[] = [
    ...studentNodes,
    ...kwList.map((k) => ({
      id: `kw:${k}`,
      name: k,
      kind: "keyword" as const,
      keywords: [],
      isMe: false,
    })),
  ];
  const bipEdges: NetEdge[] = [];
  netTopics.forEach((t, i) =>
    t.keywords.forEach((k) =>
      bipEdges.push({ source: i, target: netTopics.length + kwList.indexOf(k), shared: [k] })
    )
  );

  const viewTabs = [
    { href: "/topics", label: "카드", active: mode === "cards" },
    { href: "/topics?view=network", label: "학생 네트워크", active: mode === "network" },
    { href: "/topics?view=keywords", label: "키워드 그래프", active: mode === "keywords" },
  ];

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-display text-[16px] text-stone-600">
          동료 주제 탐색
          {user.role === "LEARNER" && (
            <span className="group relative inline-flex items-center">
              <span className="flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-stone-300 font-sans text-[10px] font-semibold text-stone-400 group-hover:border-stone-400 group-hover:text-stone-600">
                i
              </span>
              <span className="invisible absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[300px] -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 font-sans text-[11.5px] font-normal text-stone-600 opacity-0 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
                내 주제는 우측 상단 프로필 메뉴에서 설정합니다
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
          caption="같은 관심 키워드를 설정한 학습자끼리 연결됩니다 · 검은 원이 나입니다 · 선 위에 마우스를 올리면 겹치는 키워드가 표시되고, 선이 굵을수록 겹치는 키워드가 많습니다 · 원은 드래그로 옮기고, 클릭하면 해당 연구 주제로 이동합니다"
        />
      )}

      {mode === "keywords" && (
        <TopicNetwork
          nodes={bipNodes}
          edges={bipEdges}
          caption="학습자(원)와 관심 키워드(옅은 원)가 연결된 그래프입니다 · 검은 원이 나입니다 · 키워드 원이 클수록 여러 학습자가 선택한 키워드입니다 · 원은 드래그로 옮기고, 학습자를 클릭하면 해당 연구 주제로 이동합니다"
        />
      )}

      {mode === "cards" && (
        <>
          <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white px-5 py-[18px]">
            <div className="flex items-center gap-1.5 font-display text-[13px] text-stone-600">
              관심 키워드 지도
              <span className="group relative inline-flex items-center">
                <span className="flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-stone-300 font-sans text-[10px] font-semibold text-stone-400 group-hover:border-stone-400 group-hover:text-stone-600">
                  i
                </span>
                <span className="invisible absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[300px] -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 font-sans text-[11.5px] font-normal text-stone-600 opacity-0 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
                  관심 있는 키워드를 선택하세요
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
                  {t.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-line-soft px-2 py-[3px] text-[11px] font-medium text-stone-600"
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`flex gap-3.5 border-t border-line-soft pt-2.5 text-xs ${
                      liked ? "text-bad" : "text-stone-400"
                    }`}
                  >
                    <span>
                      {liked ? "♥" : "♡"} {t.likes.length}
                    </span>
                    <span className="text-stone-400">💬 {t._count.comments}</span>
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
