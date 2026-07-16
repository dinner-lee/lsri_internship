import { requireAdmin } from "@/lib/auth";
import { DiscussionBoard } from "@/components/discussion-board";
import { AutoRefresh } from "@/components/refresh";

export default async function AdminDiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const user = await requireAdmin();

  return (
    <div className="flex flex-col gap-[18px]">
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">논의</div>
        <div className="text-[12.5px] text-stone-400">
          모든 모둠의 메모장을 한눈에 확인합니다 · 화면이 보이는 동안 5초마다 자동 갱신
        </div>
      </div>
      <DiscussionBoard weekParam={week} basePath="/admin/discussions" userId={user.id} fullscreen />
    </div>
  );
}
