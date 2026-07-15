import type { AttendanceStatus } from "@prisma/client";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT"];

export const ATTENDANCE_META: Record<
  AttendanceStatus,
  { label: string; chip: string; active: string }
> = {
  PRESENT: {
    label: "출석",
    chip: "bg-[oklch(0.95_0.03_155)] text-good",
    active: "border-good bg-[oklch(0.95_0.03_155)] text-good",
  },
  ABSENT: {
    label: "결석",
    chip: "bg-bad-soft text-bad",
    active: "border-bad bg-bad-soft text-bad",
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
