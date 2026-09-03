"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import {
  createInviteCodeAction,
  toggleInviteCodeAction,
  deleteInviteCodeAction,
} from "@/lib/actions/users";

export type InviteCodeRow = { id: string; code: string; role: Role; active: boolean };

const inputCls =
  "h-9 rounded-[9px] border-[1.5px] border-transparent bg-[#f4f6f9] px-3.5 text-[12.5px] text-[#12233c] outline-none focus:border-[#003E81] focus:bg-white";

export function InviteCodeManager({ initial }: { initial: InviteCodeRow[] }) {
  const [rows, setRows] = useState(initial);
  const [code, setCode] = useState("");
  const [role, setRole] = useState<Role>("LEARNER");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const c = code.trim();
    if (!c) return;
    setError(null);
    startTransition(async () => {
      const res = await createInviteCodeAction(c, role);
      if (res.error) {
        setError(res.error);
        return;
      }
      setCode("");
      setRows((r) => [{ id: `tmp-${Date.now()}`, code: c.toUpperCase(), role, active: true }, ...r]);
    });
  };

  const toggle = (id: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    startTransition(() => { toggleInviteCodeAction(id); });
  };

  const remove = (id: string) => {
    if (!confirm("이 초대 코드를 삭제할까요? 이 코드로는 더 이상 가입할 수 없습니다.")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    startTransition(() => { deleteInviteCodeAction(id); });
  };

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-white p-6 shadow-[0_18px_44px_-26px_rgba(30,50,90,.32),0_1px_3px_rgba(30,50,90,.04)]">
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-[13.5px] text-stone-600">초대 코드 관리</span>
        <span className="text-[12px] text-stone-400">
          이 코드를 학습자·관리자에게 공유하면 &apos;가입하기&apos;에서 계정을 만들 수 있습니다
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
          placeholder="코드 (예: WELCOME2026)"
          className={`${inputCls} w-48`}
        />
        <div className="flex h-9 rounded-[9px] bg-[#f4f6f9] p-[3px]">
          {(
            [
              { key: "LEARNER", label: "학습자" },
              { key: "ADMIN", label: "관리자" },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className={`cursor-pointer rounded-[7px] px-3 text-[11.5px] font-semibold ${
                role === r.key ? "bg-white text-accent shadow-sm" : "text-stone-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={pending || !code.trim()}
          className="h-9 rounded-[9px] bg-[linear-gradient(135deg,#2a63b4,#003E81)] px-4 text-[12.5px] font-bold text-white hover:brightness-115 disabled:cursor-default disabled:bg-line disabled:opacity-60"
        >
          코드 추가
        </button>
      </div>
      {error && <span className="text-[11.5px] text-bad">{error}</span>}

      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && (
          <span className="text-[12.5px] text-stone-400">아직 발급된 초대 코드가 없습니다.</span>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-[10px] bg-paper px-3.5 py-2.5"
          >
            <span className="font-mono text-[13px] font-semibold text-stone-800">{r.code}</span>
            <span
              className={`rounded-full px-2 py-[2px] text-[10.5px] font-bold ${
                r.role === "ADMIN" ? "bg-accent-soft text-accent" : "bg-line-soft text-stone-500"
              }`}
            >
              {r.role === "ADMIN" ? "관리자용" : "학습자용"}
            </span>
            <span className="flex-1" />
            <button
              onClick={() => toggle(r.id)}
              disabled={pending}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold ${
                r.active ? "bg-accent-soft text-accent" : "bg-line-soft text-stone-400"
              }`}
            >
              {r.active ? "사용 중" : "비활성"}
            </button>
            <button
              onClick={() => remove(r.id)}
              disabled={pending}
              className="cursor-pointer text-[11px] text-stone-300 hover:text-bad"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
