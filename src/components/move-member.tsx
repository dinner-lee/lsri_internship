"use client";

import { useTransition } from "react";
import { moveGroupMemberAction } from "@/lib/actions/groups";
import { moveResearchMemberAction } from "@/lib/actions/research";

// 모둠 카드의 멤버 옆에 붙는 소형 이동 셀렉트 (관리자용)
export function MoveMemberSelect({
  kind,
  memberId,
  groupId,
  options,
}: {
  kind: "study" | "research";
  memberId: string;
  groupId: string;
  options: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const action = kind === "study" ? moveGroupMemberAction : moveResearchMemberAction;

  return (
    <select
      key={groupId}
      defaultValue={groupId}
      disabled={pending}
      title="다른 모둠으로 이동"
      onChange={(e) => {
        const target = e.target.value;
        if (target !== groupId) startTransition(() => action(memberId, target));
      }}
      className="cursor-pointer rounded-[5px] border border-line bg-white px-1 py-0.5 text-[10px] text-stone-500 hover:border-stone-300 disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
