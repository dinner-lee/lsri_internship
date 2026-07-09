"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

const LEARNER_TABS = [
  { href: "/quiz", label: "스터디" },
  { href: "/discussions", label: "논의" },
  { href: "/topics", label: "자율연구" },
];

// 관리자: '스터디' 상위 메뉴 아래 퀴즈/결과/모둠 구성
const ADMIN_STUDY_SUBMENU = [
  { href: "/admin/quizzes", label: "퀴즈" },
  { href: "/admin/results", label: "결과" },
  { href: "/admin/groups", label: "모둠 구성" },
  { href: "/admin/discussions", label: "논의" },
];
const ADMIN_STUDY_PREFIXES = [
  "/admin/quizzes",
  "/admin/results",
  "/admin/groups",
  "/admin/live",
  "/admin/discussions",
];

const ADMIN_TABS = [
  { href: "/topics", label: "자율연구" },
  { href: "/admin/users", label: "계정 관리" },
];

const tabCls = (active: boolean) =>
  `font-display rounded-lg px-2.5 py-[7px] text-[13px] whitespace-nowrap ${
    active
      ? "bg-accent-soft font-semibold text-accent"
      : "font-medium text-stone-400 hover:text-stone-600"
  }`;

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  if (role !== "ADMIN") {
    return (
      <nav className="flex gap-1">
        {LEARNER_TABS.map((t) => (
          <Link key={t.href} href={t.href} className={tabCls(isActive(t.href))}>
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }

  const studyActive = ADMIN_STUDY_PREFIXES.some((p) => isActive(p));

  return (
    <nav className="flex items-center gap-1">
      <div className="group relative">
        <Link href="/admin/quizzes" className={`flex items-center gap-1 ${tabCls(studyActive)}`}>
          스터디
          <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden className="opacity-60">
            <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </Link>
        <div className="invisible absolute left-0 z-50 w-36 pt-1 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
          <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            {ADMIN_STUDY_SUBMENU.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`font-display px-4 py-2.5 text-[13px] hover:bg-paper ${
                  isActive(t.href) ? "font-semibold text-accent" : "text-stone-700"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {ADMIN_TABS.map((t) => (
        <Link key={t.href} href={t.href} className={tabCls(isActive(t.href))}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
