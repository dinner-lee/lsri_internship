"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normKeyword } from "@/lib/utils";

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
  // 표기가 달라도(공백·대소문자) 같은 키워드의 하트로 취급
  const norm = normKeyword(keyword);
  const mine = await prisma.keywordLike.findMany({ where: { userId: user.id } });
  const existing = mine.filter((kl) => normKeyword(kl.keyword) === norm);
  if (existing.length > 0) {
    await prisma.keywordLike.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });
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
