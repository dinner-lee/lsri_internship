import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ShowcaseBoard } from "@/components/showcase-board";
import { GuestLinkManager } from "@/components/showcase-client";
import { AutoRefresh, RefreshOnFocus } from "@/components/refresh";
import { LinkIcon } from "@/components/icons";

export default async function ShowcasePage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const access = isAdmin ? await prisma.showcaseAccess.findFirst() : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <RefreshOnFocus />
      {/* 게스트 질문·발표 자료가 발표회 중 실시간에 가깝게 보이도록 10초마다 갱신 */}
      <AutoRefresh intervalMs={10000} />
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">결과보고회</div>
        <div className="text-[12.5px] text-stone-400">
          {isAdmin
            ? "모둠별 발표 자료를 확인하고, 게스트 질문을 관리합니다"
            : "모둠별 최종 발표 자료를 등록하고, 게스트 질문에 답변합니다"}
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white px-5 py-4">
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-600">
            <LinkIcon size={13} />
            게스트 링크
            <span className="ml-1 font-normal text-stone-400">
              로그인 없이 발표 자료를 보고 질문을 남길 수 있는 공유용 링크입니다
            </span>
          </span>
          <GuestLinkManager token={access?.token ?? null} />
        </div>
      )}

      <ShowcaseBoard
        viewer={{ mode: "member", userId: user.id, isAdmin }}
      />
    </div>
  );
}
