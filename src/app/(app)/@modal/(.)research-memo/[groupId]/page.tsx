import { ModalShell } from "@/components/modal-shell";
import { ResearchMemoView } from "@/app/(app)/research-memo/[groupId]/research-memo-view";

// 앱 내 이동 시 자율연구 메모장을 모달로 표시 (직접 URL 접근은 전체 페이지)
export default async function ResearchMemoModal({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <ModalShell>
      <ResearchMemoView groupId={groupId} />
    </ModalShell>
  );
}
