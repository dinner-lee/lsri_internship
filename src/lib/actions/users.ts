"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function setRoleAction(userId: string, role: Role): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "자신의 역할은 변경할 수 없습니다" };
  if (role !== "LEARNER" && role !== "ADMIN") return { error: "잘못된 역할입니다" };
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return {};
}
