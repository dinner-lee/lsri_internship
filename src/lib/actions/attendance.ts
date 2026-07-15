"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function setAttendanceAction(
  date: string,
  userId: string,
  status: AttendanceStatus | null
) {
  await requireAdmin();
  if (!DATE_RE.test(date)) return;

  if (status === null) {
    await prisma.attendance.deleteMany({ where: { date, userId } });
  } else {
    await prisma.attendance.upsert({
      where: { date_userId: { date, userId } },
      create: { date, userId, status },
      update: { status },
    });
  }
  revalidatePath("/admin/attendance");
  revalidatePath("/profile");
}

// 미체크 학습자를 전원 출석 처리
export async function markAllPresentAction(date: string) {
  await requireAdmin();
  if (!DATE_RE.test(date)) return;

  const [learners, checked] = await Promise.all([
    prisma.user.findMany({ where: { role: "LEARNER" }, select: { id: true } }),
    prisma.attendance.findMany({ where: { date }, select: { userId: true } }),
  ]);
  const done = new Set(checked.map((c) => c.userId));
  await prisma.attendance.createMany({
    data: learners
      .filter((l) => !done.has(l.id))
      .map((l) => ({ date, userId: l.id, status: "PRESENT" as const })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/attendance");
  revalidatePath("/profile");
}
