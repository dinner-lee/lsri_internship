import { ModalShell } from "@/components/modal-shell";
import { TopicDetailView } from "@/app/(app)/topics/[id]/topic-view";

// 앱 내 이동 시 주제 상세를 모달로 표시 (직접 URL 접근은 전체 페이지)
export default async function TopicDetailModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModalShell wide>
      <TopicDetailView id={id} inModal />
    </ModalShell>
  );
}
