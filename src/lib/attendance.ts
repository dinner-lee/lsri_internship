import type { AttendanceStatus } from "@prisma/client";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

export const ATTENDANCE_META: Record<
  AttendanceStatus,
  { label: string; chip: string; active: string }
> = {
  PRESENT: {
    label: "출석",
    chip: "bg-[oklch(0.95_0.03_155)] text-good",
    active: "border-good bg-[oklch(0.95_0.03_155)] text-good",
  },
  LATE: {
    label: "지각",
    chip: "bg-[oklch(0.96_0.03_60)] text-warn",
    active: "border-warn bg-[oklch(0.96_0.03_60)] text-warn",
  },
  ABSENT: {
    label: "결석",
    chip: "bg-bad-soft text-bad",
    active: "border-bad bg-bad-soft text-bad",
  },
  EXCUSED: {
    label: "공결",
    chip: "bg-line-soft text-stone-500",
    active: "border-stone-400 bg-line-soft text-stone-600",
  },
};

// KST 기준 오늘 날짜 (YYYY-MM-DD) — 서버가 UTC여도 수업일이 밀리지 않게
export function todayKST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDateKo(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${day})`;
}
