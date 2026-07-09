"use client";

import { useRouter } from "next/navigation";

export interface WeekOption {
  setId: string;
  groupId: string;
  label: string;
}

// 주차 선택 드롭다운 — 선택 시 해당 구성의 메모장으로 이동
export function WeekPicker({
  options,
  activeSetId,
}: {
  options: WeekOption[];
  activeSetId: string;
}) {
  const router = useRouter();
  return (
    <select
      value={activeSetId}
      onChange={(e) => {
        const target = options.find((o) => o.setId === e.target.value);
        if (target) router.push(`/group-memo/${target.groupId}`);
      }}
      className="font-display cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-stone-700 hover:border-stone-300"
    >
      {options.map((o) => (
        <option key={o.setId} value={o.setId}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
