import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { updateShowcaseSettingsAction } from "@/lib/actions/showcase";
import { ShowcaseBoard } from "@/components/showcase-board";
import { GuestLinkManager } from "@/components/showcase-client";
import { AutoRefresh, RefreshOnFocus } from "@/components/refresh";
import { LinkIcon, PencilIcon } from "@/components/icons";

// 게스트 화면 문구 설정 폼 (관리자 전용)
function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold text-stone-500">
        {label}
        {hint && <span className="ml-1.5 font-normal text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-[9px] border border-line bg-paper px-3 py-2 text-[12.5px] text-stone-800 focus:bg-white";

export default async function ShowcasePage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [access, settings] = isAdmin
    ? await Promise.all([
        prisma.showcaseAccess.findFirst(),
        prisma.showcaseSettings.findUnique({ where: { id: "main" } }),
      ])
    : [null, null];

  return (
    <div className="flex flex-col gap-[18px]">
      <RefreshOnFocus />
      {/* 게스트 질문·발표 자료가 발표회 중 실시간에 가깝게 보이도록 10초마다 갱신 */}
      <AutoRefresh intervalMs={10000} />
      <div className="flex flex-col gap-0.5">
        <div className="font-display text-[17px] font-bold tracking-tight">결과보고회</div>
        <div className="text-[12.5px] text-stone-400">
          {isAdmin
            ? "모둠별 발표 자료를 확인하고, 게스트 질문을 관리합니다"
            : "모둠별 최종 발표 자료를 등록하고, 게스트 질문에 답변합니다"}
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white px-5 py-4">
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-600">
            <LinkIcon size={13} />
            게스트 링크
            <span className="ml-1 font-normal text-stone-400">
              로그인 없이 발표 자료를 보고 질문을 남길 수 있는 공유용 링크입니다
            </span>
          </span>
          <GuestLinkManager token={access?.token ?? null} />
        </div>
      )}

      {isAdmin && (
        <details className="overflow-hidden rounded-[14px] border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-4 text-[12.5px] font-semibold text-stone-600 hover:bg-paper/60">
            <PencilIcon size={13} />
            게스트 화면 문구 설정
            <span className="font-normal text-stone-400">
              입장 화면의 일시·환영 문구·발표 순서를 설정합니다 (비우면 기본 문구)
            </span>
          </summary>
          <form
            action={updateShowcaseSettingsAction}
            className="flex flex-col gap-3 border-t border-line-soft px-5 py-4"
          >
            <SettingsField label="행사 일시 배지" hint="예: 8월 21일 (금) 13:00 — 15:30">
              <input name="eventBadge" defaultValue={settings?.eventBadge ?? ""} className={inputCls} />
            </SettingsField>
            <SettingsField label="환영 제목" hint="줄바꿈이 그대로 표시됩니다">
              <textarea
                name="welcomeTitle"
                rows={3}
                defaultValue={settings?.welcomeTitle ?? ""}
                placeholder={"2026학년도 학습과학연구소\n여름 인턴십 결과보고회에\n오신 것을 환영합니다"}
                className={`${inputCls} resize-y`}
              />
            </SettingsField>
            <SettingsField label="환영 설명">
              <textarea
                name="welcomeDesc"
                rows={2}
                defaultValue={settings?.welcomeDesc ?? ""}
                placeholder={"사용하실 이름 또는 소속을 입력해 주세요.\n입력하신 이름은 남기신 질문과 답글에 함께 표시됩니다."}
                className={`${inputCls} resize-y`}
              />
            </SettingsField>
            <SettingsField
              label="발표 순서"
              hint="한 줄에 하나씩, '시간 | 내용' 형식 — 비우면 모둠 주제로 자동 생성"
            >
              <textarea
                name="agenda"
                rows={5}
                defaultValue={settings?.agenda ?? ""}
                placeholder={"13:10 | 연구 모둠 1 발표\n13:35 | 연구 모둠 2 발표\n15:15 | 종합 질의응답 및 총평"}
                className={`${inputCls} resize-y`}
              />
            </SettingsField>
            <SettingsField label="발표 순서 하단 안내">
              <input
                name="agendaNote"
                defaultValue={settings?.agendaNote ?? ""}
                placeholder="질문은 발표 중 언제든 남길 수 있으며, 발표자가 종합 질의응답 시간에 답변합니다."
                className={inputCls}
              />
            </SettingsField>
            <SettingsField label="질문 보드 하단 안내">
              <input
                name="boardFooter"
                defaultValue={settings?.boardFooter ?? ""}
                placeholder="남겨주신 질문은 종합 질의응답 시간에 발표 순서대로 다뤄집니다."
                className={inputCls}
              />
            </SettingsField>
            <button
              type="submit"
              className="font-display self-end rounded-[9px] bg-accent px-5 py-2 text-[13px] text-white hover:bg-accent-strong"
            >
              저장
            </button>
          </form>
        </details>
      )}

      <ShowcaseBoard
        viewer={{ mode: "member", userId: user.id, isAdmin }}
      />
    </div>
  );
}
