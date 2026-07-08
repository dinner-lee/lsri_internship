"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";

export interface AuthFormState {
  error?: string;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다" };
    }
    throw e; // NEXT_REDIRECT
  }
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!code || !name || !username || !password)
    return { error: "모든 항목을 입력해주세요" };
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다" };
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username))
    return { error: "아이디는 3–30자의 영문/숫자/._- 만 사용할 수 있습니다" };

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || !invite.active) return { error: "유효하지 않은 초대 코드입니다" };

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "이미 사용 중인 아이디입니다" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, name, passwordHash, role: invite.role },
  });

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "가입은 완료되었습니다. 로그인해주세요" };
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
