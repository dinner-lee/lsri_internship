"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { setRoleAction } from "@/lib/actions/users";

export function RoleToggle({ userId, role }: { userId: string; role: Role }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 낙관적 갱신: 클릭 즉시 토글 이동
  const [optRole, setOptRole] = useOptimistic(role, (_s, next: Role) => next);

  const change = (next: Role) => {
    if (next === optRole) return;
    startTransition(async () => {
      setError(null);
      setOptRole(next);
      const res = await setRoleAction(userId, next);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex rounded-lg bg-line-soft p-[2px]">
        {(
          [
            { key: "LEARNER", label: "학습자" },
            { key: "ADMIN", label: "관리자" },
          ] as const
        ).map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => change(r.key)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${
              optRole === r.key ? "bg-white text-accent shadow-sm" : "text-stone-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {error && <span className="text-[10.5px] text-bad">{error}</span>}
    </div>
  );
}
