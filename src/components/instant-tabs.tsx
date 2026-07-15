"use client";

import { useState } from "react";

export interface InstantTab {
  key: string;
  label: React.ReactNode; // 아이콘 + 텍스트
  content: React.ReactNode;
  right?: React.ReactNode; // 활성 시 탭 줄 우측에 표시할 컨트롤
}

// 모든 탭 내용을 서버에서 미리 렌더링해 두고 클라이언트에서 즉시 전환
// (내용은 display로만 감추므로 전환 시 서버 왕복이 없다)
export function InstantTabs({
  tabs,
  initial,
  param = "tab",
}: {
  tabs: InstantTab[];
  initial: string;
  param?: string;
}) {
  const [active, setActive] = useState(initial);

  const select = (key: string) => {
    setActive(key);
    // 새로고침·주차 이동 링크가 현재 탭을 유지하도록 URL만 동기화
    const url = new URL(window.location.href);
    if (key === tabs[0].key) url.searchParams.delete(param);
    else url.searchParams.set(param, key);
    window.history.replaceState(null, "", url);
  };

  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-fit rounded-[9px] bg-line-soft p-[3px]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => select(t.key)}
              className={`font-display flex cursor-pointer items-center gap-1.5 rounded-[7px] px-4 py-1.5 text-[13px] ${
                active === t.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {current.right}
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "contents" : "hidden"}>
          {t.content}
        </div>
      ))}
    </>
  );
}
