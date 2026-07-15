import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ResearchMemoView } from "./research-memo-view";

// 직접 URL 접근용 전체 페이지 — 앱 내 이동 시에는 @modal 인터셉트 라우트가 모달로 표시
export default async function ResearchMemoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={user.role === "ADMIN" ? "/admin/research-groups" : "/topics"}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-800"
      >
        ← 돌아가기
      </Link>
      <ResearchMemoView groupId={groupId} />
    </div>
  );
}
