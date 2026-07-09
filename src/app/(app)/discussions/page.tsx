import { requireUser } from "@/lib/auth";
import { DiscussionBoard } from "@/components/discussion-board";
import { RefreshOnFocus, RefreshButton } from "@/components/refresh";

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-[18px]">
      <RefreshOnFocus />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[17px] font-bold tracking-tight">논의</div>
          <div className="text-[12.5px] text-stone-400">
            다른 모둠의 메모를 읽고 댓글과 좋아요를 남겨보세요
          </div>
        </div>
        <RefreshButton />
      </div>
      <DiscussionBoard weekParam={week} basePath="/discussions" userId={user.id} />
    </div>
  );
}
