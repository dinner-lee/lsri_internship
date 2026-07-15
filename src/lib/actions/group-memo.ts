"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function toggleMemoLikeAction(groupId: string) {
  const user = await requireUser();
  const existing = await prisma.groupMemoLike.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existing) {
    await prisma.groupMemoLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.groupMemoLike.create({ data: { groupId, userId: user.id } });
  }
  revalidatePath(`/group-memo/${groupId}`);
}

export async function addMemoCommentAction(groupId: string, text: string) {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) return;
  await prisma.groupMemoComment.create({
    data: { groupId, userId: user.id, text: trimmed.slice(0, 1000) },
  });
  revalidatePath(`/group-memo/${groupId}`);
}

// ── 자율연구 모둠 메모 ──────────────────────────────

export async function toggleResearchMemoLikeAction(groupId: string) {
  const user = await requireUser();
  const existing = await prisma.researchGroupMemoLike.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existing) {
    await prisma.researchGroupMemoLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.researchGroupMemoLike.create({ data: { groupId, userId: user.id } });
  }
  revalidatePath(`/research-memo/${groupId}`);
}

export async function addResearchMemoCommentAction(groupId: string, text: string) {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) return;
  await prisma.researchGroupMemoComment.create({
    data: { groupId, userId: user.id, text: trimmed.slice(0, 1000) },
  });
  revalidatePath(`/research-memo/${groupId}`);
}
