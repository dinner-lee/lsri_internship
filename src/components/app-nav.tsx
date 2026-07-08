"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

const LEARNER_TABS = [
  { href: "/quiz", label: "스터디" },
  { href: "/topics", label: "자율연구" },
];

const ADMIN_TABS = [
  { href: "/admin/quizzes", label: "퀴즈 제작" },
  { href: "/admin/results", label: "제출 현황" },
  { href: "/admin/groups", label: "모둠 구성" },
  { href: "/topics", label: "자율연구" },
  { href: "/admin/users", label: "계정 관리" },
];

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const tabs = role === "ADMIN" ? ADMIN_TABS : LEARNER_TABS;

  return (
    <nav className="flex gap-1">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`font-display rounded-lg px-3.5 py-[7px] text-[14px] ${
              active
                ? "bg-accent-soft font-semibold text-accent"
                : "font-medium text-stone-400 hover:text-stone-600"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
