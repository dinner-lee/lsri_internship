"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/lib/actions/profile";
import { UserAvatar } from "@/components/user-menu";

export function ProfileForm({
  name,
  image,
  username,
}: {
  name: string;
  image: string | null;
  username: string;
}) {
  const [state, dispatch, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {}
  );

  return (
    <form
      action={dispatch}
      className="flex max-w-[520px] flex-col gap-5 rounded-[14px] border border-line bg-white p-7"
    >
      <div className="flex items-center gap-4">
        <UserAvatar name={name} image={image} size={56} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold">{name}</span>
          <span className="text-xs text-stone-400">아이디: {username}</span>
          {!image && (
            <span className="text-[11px] text-stone-400">
              사진 없음 — Google 로그인 연동 시 계정 사진이 표시됩니다
            </span>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-stone-600">표시 이름</span>
        <input
          name="name"
          defaultValue={name}
          maxLength={30}
          className="rounded-[10px] border-[1.5px] border-line bg-paper px-4 py-3 text-[13.5px] text-stone-800"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer self-start rounded-[9px] bg-accent px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {state.error && <span className="text-xs font-medium text-bad">{state.error}</span>}
        {state.saved && !state.error && <span className="text-xs text-good">✓ 저장되었습니다</span>}
      </div>
    </form>
  );
}
