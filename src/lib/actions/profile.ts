"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export interface ProfileFormState {
  error?: string;
  saved?: boolean;
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "이름을 입력해주세요" };
  if (name.length > 30) return { error: "이름은 30자 이내여야 합니다" };

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { saved: true };
}
