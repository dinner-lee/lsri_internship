import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopicEditor } from "@/components/topic-editor";
import { ATTENDANCE_STATUSES, ATTENDANCE_META, formatDateKo } from "@/lib/attendance";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [user, attendances] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { topic: true },
    }),
    prisma.attendance.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    }),
  ]);
  if (!user) redirect("/login");
  const topic = user.topic;
  const attendanceTotals = ATTENDANCE_STATUSES.map((s) => ({
    status: s,
    count: attendances.filter((a) => a.status === s).length,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[17px] font-bold tracking-tight">사용자 정보 수정</div>
          <div className="text-[12.5px] text-stone-400">
            표시되는 이름을 변경할 수 있습니다. 프로필 사진은 Google 로그인 연동 시 자동으로
            가져옵니다.
          </div>
        </div>
        <ProfileForm name={user.name} image={user.image} username={user.username} />
      </div>

      {user.role === "LEARNER" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5 border-t border-line pt-8">
            <div className="font-display text-[17px] font-bold tracking-tight">내 출석 기록</div>
            <div className="text-[12.5px] text-stone-400">
              관리자가 체크한 출석 현황입니다
            </div>
          </div>
          {attendances.length === 0 ? (
            <div className="rounded-xl border border-line bg-white px-5 py-4 text-[13px] text-stone-400">
              아직 출석 기록이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-white px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {attendanceTotals.map(({ status, count }) => (
                  <span
                    key={status}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-semibold ${ATTENDANCE_META[status].chip}`}
                  >
                    {ATTENDANCE_META[status].label} {count}
                  </span>
                ))}
              </div>
              <div className="flex flex-col">
                {attendances.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b border-[#f7f6f4] py-2 last:border-b-0"
                  >
                    <span className="text-[12.5px] text-stone-600">{formatDateKo(a.date)}</span>
                    <span
                      className={`rounded-[6px] px-2 py-0.5 text-[11px] font-bold ${ATTENDANCE_META[a.status].chip}`}
                    >
                      {ATTENDANCE_META[a.status].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user.role === "LEARNER" && (
        <div id="topic" className="flex flex-col gap-4 scroll-mt-20">
          <div className="flex flex-col gap-0.5 border-t border-line pt-8">
            <div className="font-display text-[17px] font-bold tracking-tight">내 연구 주제 설정</div>
            <div className="text-[12.5px] text-stone-400">
              자율연구 탭의 동료 탐색에 공개되는 내용입니다
            </div>
          </div>
          <TopicEditor
            userName={user.name}
            initialMarkdown={topic?.markdown ?? ""}
            initialKeywords={topic?.keywords ?? []}
          />
        </div>
      )}
    </div>
  );
}
