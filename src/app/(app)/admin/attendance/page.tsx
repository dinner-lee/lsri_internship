import Link from "next/link";
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayKST, formatDateKo } from "@/lib/attendance";
import { AttendanceSheet, type AttendanceRow } from "./attendance-sheet";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : todayKST();

  const [learners, records] = await Promise.all([
    prisma.user.findMany({ where: { role: "LEARNER" }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany(),
  ]);

  const todayOf = new Map(
    records.filter((r) => r.date === date).map((r) => [r.userId, r.status])
  );
  const totalsOf = new Map<string, Record<AttendanceStatus, number>>();
  records.forEach((r) => {
    if (!totalsOf.has(r.userId))
      totalsOf.set(r.userId, { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 });
    totalsOf.get(r.userId)![r.status]++;
  });

  const rows: AttendanceRow[] = learners.map((l) => ({
    userId: l.id,
    name: l.name,
    status: todayOf.get(l.id) ?? null,
    totals: totalsOf.get(l.id) ?? { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 },
  }));

  // 체크 기록이 있는 날짜 (최근순)
  const checkedDates = [...new Set(records.map((r) => r.date))]
    .sort()
    .reverse()
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">출석 체크</div>
        <div className="text-[12.5px] text-stone-400">
          날짜를 선택하고 학습자별 출석 상태를 체크합니다. 학습자는 사용자 정보 화면에서 자신의
          출석 기록을 확인할 수 있습니다.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-5 py-3.5">
        <form className="flex items-center gap-2" action="/admin/attendance">
          <span className="text-xs font-semibold text-stone-600">날짜</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-stone-700"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-stone-300"
          >
            이동
          </button>
        </form>
        <span className="font-display text-[14px] text-stone-700">{formatDateKo(date)}</span>
        {checkedDates.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {checkedDates.map((d) => (
              <Link
                key={d}
                href={`/admin/attendance?date=${d}`}
                className={`rounded-full border-[1.5px] px-3 py-1 text-[11.5px] font-semibold ${
                  d === date
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-white text-stone-500 hover:border-stone-300"
                }`}
              >
                {formatDateKo(d)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <AttendanceSheet date={date} rows={rows} />
    </div>
  );
}
