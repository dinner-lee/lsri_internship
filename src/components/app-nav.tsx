"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  QuizIcon,
  ChartIcon,
  GroupIcon,
  DiscussionIcon,
  CompassIcon,
  UserIcon,
  CalendarCheckIcon,
} from "@/components/icons";

const LEARNER_TABS = [
  { href: "/quiz", label: "스터디" },
  { href: "/topics", label: "자율연구" },
];

// 관리자: '스터디' 상위 메뉴 아래 퀴즈/결과/모둠 구성
const ADMIN_STUDY_SUBMENU = [
  { href: "/admin/quizzes", label: "퀴즈", icon: QuizIcon },
  { href: "/admin/results", label: "결과", icon: ChartIcon },
  { href: "/admin/groups", label: "모둠 구성", icon: GroupIcon },
  { href: "/admin/discussions", label: "논의", icon: DiscussionIcon },
  { href: "/admin/attendance", label: "출석", icon: CalendarCheckIcon },
];
const ADMIN_STUDY_PREFIXES = [
  "/admin/quizzes",
  "/admin/results",
  "/admin/groups",
  "/admin/live",
  "/admin/discussions",
  "/admin/attendance",
];

// 관리자: '자율연구' 상위 메뉴 아래 주제 탐색/모둠 구성
const ADMIN_RESEARCH_SUBMENU = [
  { href: "/topics", label: "주제 탐색", icon: CompassIcon },
  { href: "/admin/research-groups", label: "모둠 구성", icon: GroupIcon },
];
const ADMIN_RESEARCH_PREFIXES = ["/topics", "/admin/research-groups"];

const ADMIN_TABS = [{ href: "/admin/users", label: "계정 관리" }];

const tabCls = (active: boolean) =>
  `font-display rounded-lg px-2.5 py-[7px] text-[13px] whitespace-nowrap ${
    active
      ? "bg-accent-soft font-semibold text-accent"
      : "font-medium text-stone-400 hover:text-stone-600"
  }`;

export function AppNav({ role, variant = "desktop" }: { role: Role; variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  if (role !== "ADMIN") {
    // 학습자는 탭 2개뿐이라 모바일에서도 그대로 표시
    if (variant === "mobile") return null;
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
  const researchActive = ADMIN_RESEARCH_PREFIXES.some((p) => isActive(p));

  const dropdown = (
    label: string,
    href: string,
    active: boolean,
    submenu: { href: string; label: string; icon: React.ComponentType<{ size?: number }> }[]
  ) => (
    <div className="group relative">
      <Link href={href} className={`flex items-center gap-1 ${tabCls(active)}`}>
        {label}
        <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden className="opacity-60">
          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </Link>
      <div className="invisible absolute left-0 z-50 w-36 pt-1 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          {submenu.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`font-display flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-paper ${
                isActive(t.href) ? "font-semibold text-accent" : "text-stone-700"
              }`}
            >
              <span className={isActive(t.href) ? "text-accent" : "text-stone-400"}>
                <t.icon size={15} />
              </span>
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const mobileItem = (
    href: string,
    label: string,
    Icon: React.ComponentType<{ size?: number }>
  ) => (
    <Link
      key={href}
      href={href}
      onClick={() => setOpen(false)}
      className={`font-display flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] hover:bg-paper ${
        isActive(href) ? "font-semibold text-accent" : "text-stone-700"
      }`}
    >
      <span className={isActive(href) ? "text-accent" : "text-stone-400"}>
        <Icon size={15} />
      </span>
      {label}
    </Link>
  );

  // 데스크톱: 호버 드롭다운 내비 (헤더 좌측)
  if (variant === "desktop")
    return (
      <nav className="hidden items-center gap-1 md:flex">
        {dropdown("스터디", "/admin/quizzes", studyActive, ADMIN_STUDY_SUBMENU)}
        {dropdown("자율연구", "/topics", researchActive, ADMIN_RESEARCH_SUBMENU)}
        {ADMIN_TABS.map((t) => (
          <Link key={t.href} href={t.href} className={tabCls(isActive(t.href))}>
            {t.label}
          </Link>
        ))}
      </nav>
    );

  // 모바일: 햄버거 메뉴 (헤더 우측)
  return (
    <div className="relative md:hidden">
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-600 hover:bg-line-soft"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
        {open && (
          <>
            {/* 바깥 클릭 시 닫기 */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-1.5 flex w-52 flex-col overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
              <span className="px-5 pt-2 pb-1 text-[10.5px] font-semibold text-stone-400">
                스터디
              </span>
              {ADMIN_STUDY_SUBMENU.map((t) => mobileItem(t.href, t.label, t.icon))}
              <span className="mt-1 border-t border-line-soft px-5 pt-3 pb-1 text-[10.5px] font-semibold text-stone-400">
                자율연구
              </span>
              {ADMIN_RESEARCH_SUBMENU.map((t) => mobileItem(t.href, t.label, t.icon))}
              <div className="mt-1 border-t border-line-soft pt-1">
                {mobileItem("/admin/users", "계정 관리", UserIcon)}
              </div>
            </div>
          </>
        )}
      </div>
  );
}
