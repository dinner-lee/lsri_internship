import { prisma } from "@/lib/prisma";
import { topicTitleOf } from "@/lib/utils";
import { serviceIconOf } from "@/components/showcase-board";
import { GuestExperience, type GuestBoardGroup, type GuestBoardTexts } from "@/components/guest-board";
import { AutoRefresh, RefreshOnFocus } from "@/components/refresh";

// 문구를 관리자가 설정하지 않았을 때의 기본값
const DEFAULT_TEXTS = {
  welcomeTitle: "2026학년도 학습과학연구소\n여름 인턴십 결과보고회에\n오신 것을 환영합니다",
  welcomeDesc: "사용하실 이름 또는 소속을 입력해 주세요.\n입력하신 이름은 남기신 질문과 답글에 함께 표시됩니다.",
  agendaNote: "질문은 발표 중 언제든 남길 수 있습니다.",
  boardFooter: "남겨주신 질문은 종합 질의응답 시간에 발표 순서대로 다뤄집니다.",
};

// 게스트용 결과보고회 페이지 — 관리자가 발급한 토큰 링크로만 접근 (로그인 불필요)
export default async function GuestShowcasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await prisma.showcaseAccess.findUnique({ where: { token } });

  if (!access)
    return (
      <div className="grid min-h-screen place-items-center bg-[linear-gradient(150deg,#eef1fa_0%,#f5f6fa_45%,#ecf3f1_100%)] px-4">
        <div className="rounded-[20px] bg-white p-10 text-center text-sm text-stone-400 shadow-[0_24px_60px_-30px_rgba(10,44,86,.35)]">
          유효하지 않은 링크입니다. 담당자에게 새 링크를 요청해 주세요.
        </div>
      </div>
    );

  const [set, settings] = await Promise.all([
    prisma.researchGroupSet.findFirst({
      where: { confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: {
        groups: {
          orderBy: { index: "asc" },
          include: {
            topic: { select: { markdown: true } },
            members: { include: { user: { select: { name: true } } } },
            showcaseLinks: { orderBy: { createdAt: "asc" } },
            guestQuestions: {
              orderBy: { createdAt: "asc" },
              include: {
                likes: { select: { voterKey: true } },
                answers: {
                  orderBy: { createdAt: "asc" },
                  include: { user: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.showcaseSettings.findUnique({ where: { id: "main" } }),
  ]);

  const groups: GuestBoardGroup[] = (set?.groups ?? []).map((g, i) => ({
    id: g.id,
    no: String(i + 1).padStart(2, "0"),
    title: g.customTopic ?? topicTitleOf(g.topic.markdown),
    members: g.members.map((m) => m.user.name.split("/")[0].trim()),
    links: g.showcaseLinks.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      icon: serviceIconOf(l.url),
    })),
    questions: g.guestQuestions.map((q) => ({
      id: q.id,
      author: q.guestName,
      authorKey: q.authorKey,
      text: q.content,
      createdAt: q.createdAt.toISOString(),
      likes: q.likes.map((l) => l.voterKey),
      answered: q.answers.some((a) => a.userId),
      replies: q.answers.map((a) => ({
        id: a.id,
        author: a.user ? a.user.name.split("/")[0].trim() : (a.guestName ?? "게스트"),
        presenter: !!a.userId,
        createdAt: a.createdAt.toISOString(),
        text: a.content,
      })),
    })),
  }));

  // 발표 순서 — 관리자가 설정한 "시간 | 라벨" 줄 목록, 비어 있으면 모둠 주제로 자동 생성
  const agendaLines = (settings?.agenda ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const agenda =
    agendaLines.length > 0
      ? agendaLines.map((line) => {
          const [a, ...rest] = line.split("|");
          return rest.length > 0
            ? { time: a.trim(), label: rest.join("|").trim() }
            : { time: "", label: a.trim() };
        })
      : groups.map((g) => ({ time: "", label: g.title }));

  const texts: GuestBoardTexts = {
    eventBadge: settings?.eventBadge ?? "",
    welcomeTitle: settings?.welcomeTitle || DEFAULT_TEXTS.welcomeTitle,
    welcomeDesc: settings?.welcomeDesc || DEFAULT_TEXTS.welcomeDesc,
    agenda,
    agendaNote: settings?.agendaNote || DEFAULT_TEXTS.agendaNote,
    boardFooter: settings?.boardFooter || DEFAULT_TEXTS.boardFooter,
  };

  return (
    <>
      <RefreshOnFocus />
      {/* 게스트는 인원이 많을 수 있어 1분 간격으로만 갱신 (서버 부하 절감) */}
      <AutoRefresh intervalMs={60000} />
      <GuestExperience token={token} groups={groups} texts={texts} />
    </>
  );
}
