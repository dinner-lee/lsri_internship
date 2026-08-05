"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MAX_LEN = 3000;

export async function createQnaQuestionAction(content: string) {
  const user = await requireUser();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;
  await prisma.qnaQuestion.create({ data: { userId: user.id, content: text } });
  revalidatePath("/quiz");
}

// 작성자 본인 또는 관리자만 삭제 (댓글·좋아요는 cascade)
export async function deleteQnaQuestionAction(questionId: string) {
  const user = await requireUser();
  const q = await prisma.qnaQuestion.findUnique({ where: { id: questionId } });
  if (!q || (q.userId !== user.id && user.role !== "ADMIN")) return;
  await prisma.qnaQuestion.delete({ where: { id: questionId } });
  revalidatePath("/quiz");
}

export async function toggleQnaLikeAction(questionId: string) {
  const user = await requireUser();
  const existing = await prisma.qnaLike.findUnique({
    where: { questionId_userId: { questionId, userId: user.id } },
  });
  if (existing) await prisma.qnaLike.delete({ where: { id: existing.id } });
  else await prisma.qnaLike.create({ data: { questionId, userId: user.id } });
  revalidatePath("/quiz");
}

// parentId가 있으면 답글 — 답글의 답글은 부모 댓글로 평탄화 (1단계 유지)
export async function addQnaCommentAction(
  questionId: string,
  content: string,
  parentId?: string | null
) {
  const user = await requireUser();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;

  let parent: string | null = null;
  if (parentId) {
    const p = await prisma.qnaComment.findUnique({ where: { id: parentId } });
    if (!p || p.questionId !== questionId) return;
    parent = p.parentId ?? p.id;
  }

  await prisma.qnaComment.create({
    data: { questionId, userId: user.id, content: text, parentId: parent },
  });
  revalidatePath("/quiz");
}

export async function deleteQnaCommentAction(commentId: string) {
  const user = await requireUser();
  const c = await prisma.qnaComment.findUnique({ where: { id: commentId } });
  if (!c || (c.userId !== user.id && user.role !== "ADMIN")) return;
  await prisma.qnaComment.delete({ where: { id: commentId } });
  revalidatePath("/quiz");
}
