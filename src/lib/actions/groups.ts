"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { makeGroups, type GroupMethodKey } from "@/lib/groups";

// 이전 확정 모둠 (기준 퀴즈 제외, 가장 최근 확정) → userId → group index
export async function getPrevGroupOf(excludeQuizId: string) {
  const prev = await prisma.groupSet.findFirst({
    where: { confirmedAt: { not: null }, quizId: { not: excludeQuizId } },
    orderBy: { confirmedAt: "desc" },
    include: { groups: { include: { members: true } } },
  });
  const prevGroupOf: Record<string, number> = {};
  prev?.groups.forEach((g) => g.members.forEach((m) => (prevGroupOf[m.userId] = g.index)));
  return prevGroupOf;
}

export async function generateGroupsAction(
  quizId: string,
  size: number,
  method: GroupMethodKey,
  avoidPrev: boolean
): Promise<{ error?: string }> {
  await requireAdmin();
  if (size < 2 || size > 10) return { error: "모둠 인원은 2–10명이어야 합니다" };

  const submissions = await prisma.submission.findMany({
    where: { quizId },
    include: { user: true },
  });
  const students = submissions
    .filter((s) => s.user.role === "LEARNER")
    .map((s) => ({ userId: s.userId, name: s.user.name, score: s.score }));
  if (students.length < 2) return { error: "제출한 학습자가 2명 이상이어야 합니다" };

  const prevGroupOf = avoidPrev ? await getPrevGroupOf(quizId) : {};
  const groups = makeGroups(students, size, method, avoidPrev, prevGroupOf);

  await prisma.$transaction(async (tx) => {
    // 같은 퀴즈의 미확정 구성은 교체 (확정된 기록은 보존)
    await tx.groupSet.deleteMany({ where: { quizId, confirmedAt: null } });
    await tx.groupSet.create({
      data: {
        quizId,
        size,
        method,
        avoidPrev,
        groups: {
          create: groups.map((grp, i) => ({
            index: i,
            members: { create: grp.map((m) => ({ userId: m.userId })) },
          })),
        },
      },
    });
  });

  revalidatePath("/admin/groups");
  return {};
}

// 확정: 기존 확정 기록은 해제하지 않고 보존한다.
// 학습자에게는 confirmedAt이 가장 최근인 구성이 표시된다.
export async function confirmGroupsAction(groupSetId: string) {
  await requireAdmin();
  await prisma.groupSet.update({
    where: { id: groupSetId },
    data: { confirmedAt: new Date() },
  });
  revalidatePath("/admin/groups");
  revalidatePath("/quiz");
}

// 멤버를 같은 세트의 다른 모둠으로 이동 (확정 후 수동 조정용)
export async function moveGroupMemberAction(memberId: string, targetGroupId: string) {
  await requireAdmin();
  const [member, target] = await Promise.all([
    prisma.groupMember.findUnique({ where: { id: memberId }, include: { group: true } }),
    prisma.group.findUnique({ where: { id: targetGroupId } }),
  ]);
  if (!member || !target) return;
  if (member.group.groupSetId !== target.groupSetId || member.groupId === target.id) return;

  await prisma.groupMember.update({ where: { id: memberId }, data: { groupId: target.id } });
  revalidatePath("/admin/groups");
  revalidatePath("/quiz");
}
