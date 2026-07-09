import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MemoView } from "./memo-view";

export default async function GroupMemoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={user.role === "ADMIN" ? "/admin/groups" : "/quiz"}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-800"
      >
        ← 돌아가기
      </Link>
      <MemoView groupId={groupId} />
    </div>
  );
}
