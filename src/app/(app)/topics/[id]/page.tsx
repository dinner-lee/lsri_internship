import Link from "next/link";
import { TopicDetailView } from "./topic-view";

// 직접 URL 접근용 전체 페이지 — 앱 내 이동 시에는 @modal 인터셉트 라우트가 모달로 표시
export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/topics" className="text-xs text-stone-400 hover:text-stone-600">
        ← 목록으로
      </Link>
      <TopicDetailView id={id} />
    </div>
  );
}
