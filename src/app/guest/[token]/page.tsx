import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ShowcaseBoard } from "@/components/showcase-board";
import { GuestGate } from "@/components/showcase-client";
import { AutoRefresh, RefreshOnFocus } from "@/components/refresh";

// 게스트용 결과보고회 페이지 — 관리자가 발급한 토큰 링크로만 접근 (로그인 불필요)
export default async function GuestShowcasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await prisma.showcaseAccess.findUnique({ where: { token } });

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-50 border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-[960px] items-center gap-2.5 px-4 py-3 sm:px-6">
          <Image
            src="/lsri-logo.png"
            alt="학습과학연구소 Learning Sciences Research Institute"
            width={128}
            height={28}
            priority
          />
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="font-display hidden text-[15px] font-normal tracking-tight whitespace-nowrap text-accent sm:inline">
            2026학년도 여름 인턴십 · 결과보고회
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6">
        {access ? (
          <GuestGate>
            <RefreshOnFocus />
            {/* 게스트는 인원이 많을 수 있어 1분 간격으로만 갱신 (서버 부하 절감) */}
            <AutoRefresh intervalMs={60000} />
            <div className="flex flex-col gap-0.5">
              <div className="font-display text-[17px] font-bold tracking-tight">결과보고회</div>
              <div className="text-[12.5px] text-stone-400">
                모둠별 발표 자료를 살펴보고, 궁금한 점을 질문으로 남겨보세요
              </div>
            </div>
            <ShowcaseBoard viewer={{ mode: "guest", token }} />
          </GuestGate>
        ) : (
          <div className="rounded-[14px] border border-line bg-white p-10 text-center text-sm text-stone-400">
            유효하지 않은 링크입니다. 담당자에게 새 링크를 요청해 주세요.
          </div>
        )}
      </main>
    </div>
  );
}
