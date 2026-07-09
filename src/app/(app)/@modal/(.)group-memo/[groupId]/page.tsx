import { requireUser } from "@/lib/auth";
import { ModalShell } from "@/components/modal-shell";
import { MemoView } from "@/app/(app)/group-memo/[groupId]/memo-view";

// 앱 내 이동 시 메모장을 모달로 표시 (직접 URL 접근은 전체 페이지)
export default async function GroupMemoModal({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();
  const closeHref = user.role === "ADMIN" ? "/admin/groups" : "/quiz";

  return (
    <ModalShell closeHref={closeHref}>
      <MemoView groupId={groupId} />
    </ModalShell>
  );
}
