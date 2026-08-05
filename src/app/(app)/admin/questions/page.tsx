import { requireAdmin } from "@/lib/auth";
import { QuestionBoard } from "@/components/question-board";
import { RefreshOnFocus } from "@/components/refresh";

export default async function AdminQuestionsPage() {
  const user = await requireAdmin();

  return (
    <div className="flex flex-col gap-[18px]">
      <RefreshOnFocus />
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">질문 게시판</div>
        <div className="text-[12.5px] text-stone-400">
          학습자들이 올린 질문을 확인하고 댓글로 답합니다 · 모든 질문·댓글을 삭제할 수 있습니다
        </div>
      </div>
      <QuestionBoard userId={user.id} isAdmin />
    </div>
  );
}
