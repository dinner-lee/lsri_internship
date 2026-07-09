"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/lib/actions/auth";

const inputCls =
  "w-full rounded-[10px] border border-line bg-paper px-4 py-3 text-[14px] text-stone-800 placeholder:text-stone-300";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginDispatch, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    {}
  );
  const [regState, regDispatch, regPending] = useActionState<AuthFormState, FormData>(
    registerAction,
    {}
  );

  const isLogin = mode === "login";
  const state = isLogin ? loginState : regState;
  const pending = isLogin ? loginPending : regPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-[10px] bg-line-soft p-1">
        {(
          [
            { key: "login", label: "로그인" },
            { key: "register", label: "가입하기" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`font-display flex-1 cursor-pointer rounded-lg py-2 text-[13px] transition-colors ${
              mode === t.key ? "bg-white text-accent shadow-sm" : "text-stone-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form action={isLogin ? loginDispatch : regDispatch} className="flex flex-col gap-2.5">
        {!isLogin && (
          <>
            <input name="code" placeholder="초대 코드" className={inputCls} required />
            <input name="name" placeholder="이름 (예: 김서연)" className={inputCls} required />
          </>
        )}
        <input name="username" placeholder="아이디" className={inputCls} required />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          className={inputCls}
          required
        />

        {state.error && <p className="text-xs font-medium text-bad">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="font-display mt-1.5 cursor-pointer rounded-[10px] bg-accent py-3 text-[15px] text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "잠시만요…" : isLogin ? "로그인" : "가입하고 시작하기"}
        </button>
      </form>

      {!isLogin && (
        <p className="text-center text-[11.5px] leading-relaxed text-stone-400">
          초대 코드는 관리자에게 요청하십시오
        </p>
      )}
    </div>
  );
}
