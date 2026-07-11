import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { UserAvatar } from "@/components/user-menu";
import { RoleToggle } from "./role-toggle";

export default async function AdminUsersPage() {
  const me = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { submissions: true } } },
  });
  const admins = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">계정 관리</div>
        <div className="text-[12.5px] text-stone-400">
          전체 {users.length}명 · 관리자 {admins}명 — Google로 처음 로그인한 계정은 학습자로
          생성되며, 여기에서 역할을 변경할 수 있습니다
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-[1fr_130px_190px_90px_150px] gap-2 border-b border-line-soft px-5 py-[11px] text-[11px] font-semibold text-stone-400">
          <span>이름</span>
          <span>아이디</span>
          <span>이메일</span>
          <span className="text-right">제출</span>
          <span className="text-right">역할</span>
        </div>
        {users.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[1fr_130px_190px_90px_150px] items-center gap-2 border-b border-[#f7f6f4] px-5 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-2.5">
              <UserAvatar name={u.name} image={u.image} size={28} />
              <span className="text-[13px] font-medium text-stone-800">
                {u.name}
                {u.id === me.id && <span className="ml-1 text-[11px] text-stone-400">(나)</span>}
              </span>
              {u.email && (
                <span className="rounded-[4px] bg-line-soft px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
                  Google
                </span>
              )}
            </div>
            <span className="truncate text-xs text-stone-500">{u.username}</span>
            <span className="truncate text-xs text-stone-400">{u.email ?? "–"}</span>
            <span className="text-right text-xs text-stone-500">{u._count.submissions}</span>
            <div className="flex justify-end">
              {u.id === me.id ? (
                <span className="rounded-md bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                  관리자
                </span>
              ) : (
                <RoleToggle userId={u.id} role={u.role} />
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
