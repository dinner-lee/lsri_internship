import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Google 로그인 활성화: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET 환경 변수만 설정하면 됩니다.
// - User.email이 일치하는 기존 계정에 연결되고, 없으면 학습자 계정이 자동 생성됩니다
//   (역할은 관리자가 '계정 관리'에서 변경)
// - 프로필 사진은 Google 계정에서 자동 동기화, 이름은 비어있을 때만 가져오고 이후 수정 가능
const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email;
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { email },
          data: {
            image: (profile.picture as string | undefined) ?? existing.image,
            name: existing.name || ((profile.name as string | undefined) ?? existing.name),
          },
        });
        return true;
      }
      // 처음 로그인한 Google 계정 → 학습자로 자동 생성 (역할은 관리자가 변경)
      const base =
        email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_.-]/g, "")
          .slice(0, 24) || "user";
      let username = base;
      for (let n = 2; await prisma.user.findUnique({ where: { username } }); n++) {
        username = `${base}${n}`;
      }
      await prisma.user.create({
        data: {
          username,
          email,
          name: (profile.name as string | undefined) ?? base,
          image: (profile.picture as string | undefined) ?? null,
          role: "LEARNER",
          // Google 전용 계정 — 비밀번호 로그인 불가하도록 무작위 해시
          passwordHash: await bcrypt.hash(
            Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex"),
            10
          ),
        },
      });
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: profile.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      } else if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("로그인이 필요합니다");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다");
  return user;
}
