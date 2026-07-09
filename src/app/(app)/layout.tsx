import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 이름/사진은 항상 DB 최신값으로 표시 (프로필 수정 즉시 반영)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-3 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex flex-none items-center gap-2.5">
              <Image
                src="/lsri-logo.png"
                alt="학습과학연구소 Learning Sciences Research Institute"
                width={128}
                height={28}
                priority
              />
              <span className="h-4 w-px bg-line" />
              <span className="font-display text-[15px] font-normal tracking-tight whitespace-nowrap text-accent">
                2026학년도 여름 인턴십
              </span>
            </div>
            <AppNav role={user.role} />
          </div>
          <div className="flex flex-none items-center gap-2">
            <span className="rounded-md bg-line-soft px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-stone-500">
              {user.role === "ADMIN" ? "관리자" : "학습자"}
            </span>
            <UserMenu name={user.name} image={user.image} role={user.role} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[960px] px-8 pt-8 pb-20">{children}</main>
    </>
  );
}
