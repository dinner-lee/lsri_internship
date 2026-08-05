import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { UserAvatar } from "@/components/user-menu";
import {
  NewQuestionForm,
  QnaLikeButton,
  QnaDeleteButton,
  CommentComposer,
} from "@/components/question-board-client";

// 질문 게시판 — 질문 + 댓글/답글 + 좋아요 (학습자·관리자 공용)
export async function QuestionBoard({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const questions = await prisma.qnaQuestion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, image: true } },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <NewQuestionForm />

      {questions.length === 0 && (
        <div className="rounded-[14px] border border-line bg-white p-7 text-center text-sm text-stone-400">
          아직 올라온 질문이 없습니다 — 첫 질문을 올려보세요
        </div>
      )}

      {questions.map((q) => {
        const topComments = q.comments.filter((c) => c.parentId === null);
        const repliesOf = (id: string) => q.comments.filter((c) => c.parentId === id);
        const canDelete = isAdmin || q.userId === userId;

        return (
          <div key={q.id} className="overflow-hidden rounded-[14px] border border-line bg-white">
            <div className="flex flex-col gap-2.5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <UserAvatar name={q.user.name} image={q.user.image} size={30} />
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-stone-700">
                    {q.user.name.split("/")[0].trim()}
                  </span>
                  <span className="text-[10.5px] text-stone-400">
                    {formatDateTime(q.createdAt)}
                  </span>
                </div>
                {canDelete && (
                  <span className="ml-auto">
                    <QnaDeleteButton kind="question" id={q.id} />
                  </span>
                )}
              </div>
              <div className="text-[13.5px] leading-[1.8] whitespace-pre-wrap [overflow-wrap:anywhere] text-stone-800">
                {q.content}
              </div>
              <div className="flex items-center gap-3">
                <QnaLikeButton
                  questionId={q.id}
                  liked={q.likes.some((l) => l.userId === userId)}
                  count={q.likes.length}
                />
                <span className="text-[11.5px] text-stone-400">댓글 {q.comments.length}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 border-t border-line-soft bg-paper/60 px-5 py-4">
              {topComments.map((c) => (
                <div key={c.id} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <UserAvatar name={c.user.name} image={c.user.image} size={24} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline gap-1.5 text-[11px] text-stone-400">
                        <b className="text-[11.5px] font-semibold text-stone-600">
                          {c.user.name.split("/")[0].trim()}
                        </b>
                        {formatDateTime(c.createdAt)}
                        {(isAdmin || c.userId === userId) && (
                          <QnaDeleteButton kind="comment" id={c.id} />
                        )}
                      </span>
                      <div className="text-[12.5px] leading-relaxed [overflow-wrap:anywhere] text-stone-800">
                        {c.content}
                      </div>

                      {repliesOf(c.id).map((r) => (
                        <div key={r.id} className="mt-1.5 flex gap-2 border-l-2 border-line pl-3">
                          <UserAvatar name={r.user.name} image={r.user.image} size={20} />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-baseline gap-1.5 text-[10.5px] text-stone-400">
                              <b className="text-[11px] font-semibold text-stone-600">
                                {r.user.name.split("/")[0].trim()}
                              </b>
                              {formatDateTime(r.createdAt)}
                              {(isAdmin || r.userId === userId) && (
                                <QnaDeleteButton kind="comment" id={r.id} />
                              )}
                            </span>
                            <div className="text-[12.5px] leading-relaxed [overflow-wrap:anywhere] text-stone-800">
                              {r.content}
                            </div>
                          </div>
                        </div>
                      ))}

                      <details className="mt-1">
                        <summary className="w-fit cursor-pointer list-none text-[11px] text-stone-400 hover:text-accent">
                          답글 달기
                        </summary>
                        <div className="mt-1.5">
                          <CommentComposer
                            questionId={q.id}
                            parentId={c.id}
                            placeholder={`${c.user.name.split("/")[0].trim()}님에게 답글`}
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ))}

              <CommentComposer questionId={q.id} placeholder="댓글을 남겨보세요" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
