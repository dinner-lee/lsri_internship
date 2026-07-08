"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function saveTopicAction(markdown: string, keywords: string[]) {
  const user = await requireUser();
  const cleanKeywords = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 20);
  await prisma.topic.upsert({
    where: { userId: user.id },
    create: { userId: user.id, markdown, keywords: cleanKeywords },
    update: { markdown, keywords: cleanKeywords },
  });
  revalidatePath("/topics");
}

export async function toggleTopicLikeAction(topicId: string) {
  const user = await requireUser();
  const existing = await prisma.topicLike.findUnique({
    where: { topicId_userId: { topicId, userId: user.id } },
  });
  if (existing) {
    await prisma.topicLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.topicLike.create({ data: { topicId, userId: user.id } });
  }
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/topics");
}

export async function toggleKeywordLikeAction(keyword: string) {
  const user = await requireUser();
  const existing = await prisma.keywordLike.findUnique({
    where: { keyword_userId: { keyword, userId: user.id } },
  });
  if (existing) {
    await prisma.keywordLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.keywordLike.create({ data: { keyword, userId: user.id } });
  }
  revalidatePath("/topics");
}

export async function addCommentAction(topicId: string, text: string) {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) return;
  await prisma.comment.create({
    data: { topicId, userId: user.id, text: trimmed.slice(0, 1000) },
  });
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/topics");
}
