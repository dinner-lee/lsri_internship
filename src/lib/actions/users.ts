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

// ── 초대 코드 ─────────────────────────────────────────────

const CODE_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export async function createInviteCodeAction(
  code: string,
  role: Role
): Promise<{ error?: string }> {
  await requireAdmin();
  const c = code.trim().toUpperCase();
  if (!CODE_RE.test(c))
    return { error: "코드는 3–30자의 영문/숫자/_- 만 사용할 수 있습니다" };
  if (role !== "LEARNER" && role !== "ADMIN") return { error: "잘못된 역할입니다" };

  const exists = await prisma.inviteCode.findUnique({ where: { code: c } });
  if (exists) return { error: "이미 사용 중인 코드입니다" };

  await prisma.inviteCode.create({ data: { code: c, role, active: true } });
  revalidatePath("/admin/users");
  return {};
}

export async function toggleInviteCodeAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const invite = await prisma.inviteCode.findUnique({ where: { id } });
  if (!invite) return { error: "존재하지 않는 코드입니다" };
  await prisma.inviteCode.update({ where: { id }, data: { active: !invite.active } });
  revalidatePath("/admin/users");
  return {};
}

export async function deleteInviteCodeAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.inviteCode.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/users");
  return {};
}
