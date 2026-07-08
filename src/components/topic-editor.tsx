"use client";

import { useState, useTransition } from "react";
import { saveTopicAction } from "@/lib/actions/topics";
import { Markdown } from "@/lib/md";
import { initialOf } from "@/lib/utils";

export function TopicEditor({
  userName,
  initialMarkdown,
  initialKeywords,
}: {
  userName: string;
  initialMarkdown: string;
  initialKeywords: string[];
}) {
  const [md, setMd] = useState(initialMarkdown);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (k && !keywords.includes(k)) setKeywords([...keywords, k]);
    setNewKeyword("");
    setSaved(false);
  };

  const save = () =>
    startTransition(async () => {
      await saveTopicAction(md, keywords);
      setSaved(true);
    });

  return (
    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="font-display text-[13.5px] text-stone-600">마크다운으로 작성</div>
          <button
            onClick={save}
            disabled={pending}
            className="cursor-pointer rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {pending ? "저장 중…" : saved ? "✓ 저장됨" : "저장"}
          </button>
        </div>
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            setSaved(false);
          }}
          placeholder={"## 관심 연구 주제\n\n어떤 현상이 궁금한지, 어떻게 알아보고 싶은지 적어보세요."}
          className="min-h-[300px] resize-y rounded-xl border border-line bg-white p-4 font-mono text-[12.5px] leading-[1.7] text-stone-800"
        />
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
          <div className="text-xs font-semibold text-stone-600">관심 키워드</div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <div
                key={k}
                className="flex items-center gap-1.5 rounded-full bg-accent-soft py-[5px] pr-2 pl-3 text-xs font-medium text-accent"
              >
                {k}
                <button
                  onClick={() => {
                    setKeywords(keywords.filter((x) => x !== k));
                    setSaved(false);
                  }}
                  className="cursor-pointer text-[13px] leading-none text-accent/60 hover:text-accent"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addKeyword();
            }}
            placeholder="키워드 입력 후 Enter"
            className="rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-stone-800"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="font-display text-[13.5px] text-stone-600">동료에게 보이는 모습</div>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-line font-display text-[13.5px] text-stone-600">
              {initialOf(userName)}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold">{userName}</span>
              <span className="text-[11px] text-stone-400">
                {saved ? "저장됨" : "저장 전 미리보기"}
              </span>
            </div>
          </div>
          <div className="text-[13.5px] leading-[1.7] text-stone-700">
            <Markdown md={md} />
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-line-soft px-[11px] py-1 text-[11.5px] font-medium text-stone-600"
                >
                  #{k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
