"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { makeResearchGroups } from "@/lib/research-groups";

// 관심 주제 순위 설정: rank가 null이면 해제, 이미 다른 주제가 가진 순위면 그 주제에서 회수
export async function setTopicPickAction(topicId: string, rank: number | null) {
  const user = await requireUser();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.userId === user.id) return; // 본인 주제는 선택 불가

  await prisma.$transaction(async (tx) => {
    await tx.topicPick.deleteMany({ where: { userId: user.id, topicId } });
    if (rank !== null && rank >= 1 && rank <= 5) {
      await tx.topicPick.deleteMany({ where: { userId: user.id, rank } });
      await tx.topicPick.create({ data: { userId: user.id, topicId, rank } });
    }
  });
  revalidatePath("/topics");
  revalidatePath("/admin/research-groups");
}

// 미확정 세트를 지우고 현재 선호를 기준으로 n개 모둠을 새로 생성
export async function generateResearchGroupsAction(groupCount: number) {
  await requireAdmin();
  const count = Math.max(1, Math.min(20, Math.round(groupCount)));

  const [students, picks, topics] = await Promise.all([
    prisma.user.findMany({ where: { role: "LEARNER" }, select: { id: true } }),
    prisma.topicPick.findMany(),
    prisma.topic.findMany({ where: { markdown: { not: "" } }, select: { id: true } }),
  ]);
  if (students.length === 0 || topics.length === 0) return;

  const result = makeResearchGroups(
    students.map((s) => s.id),
    picks,
    topics.map((t) => t.id),
    count
  );

  await prisma.$transaction(async (tx) => {
    await tx.researchGroupSet.deleteMany({ where: { confirmedAt: null } });
    await tx.researchGroupSet.create({
      data: {
        groupCount: result.length,
        groups: {
          create: result.map((g, i) => ({
            index: i,
            topicId: g.topicId,
            members: {
              create: g.memberIds.map((userId) => ({ userId, rank: g.rankOf[userId] })),
            },
          })),
        },
      },
    });
  });
  revalidatePath("/admin/research-groups");
}

export async function confirmResearchGroupsAction(setId: string) {
  await requireAdmin();
  await prisma.researchGroupSet.update({
    where: { id: setId },
    data: { confirmedAt: new Date() },
  });
  revalidatePath("/admin/research-groups");
  revalidatePath("/topics");
}

export async function deleteResearchSetAction(setId: string) {
  await requireAdmin();
  // 잘못 확정한 세트 정리용
  await prisma.researchGroupSet.delete({ where: { id: setId } });
  revalidatePath("/admin/research-groups");
  revalidatePath("/topics");
}
