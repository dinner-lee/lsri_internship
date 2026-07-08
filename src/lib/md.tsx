import React from "react";

// 간단 마크다운 렌더러 (제목/리스트/굵게/문단) — 연구 주제용
export function Markdown({ md }: { md: string }) {
  const blocks: React.ReactNode[] = [];
  let list: React.ReactNode[] | null = null;
  let key = 0;

  const flush = () => {
    if (list) {
      blocks.push(
        <ul key={key++} className="my-1 flex list-disc flex-col gap-1 pl-5">
          {list}
        </ul>
      );
      list = null;
    }
  };

  const inline = (t: string) =>
    t.split(/\*\*(.+?)\*\*/g).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s));

  (md || "").split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flush();
      return;
    }
    if (/^#{1,3} /.test(line)) {
      flush();
      blocks.push(
        <div key={key++} className="my-0.5 text-[15.5px] font-bold tracking-tight">
          {line.replace(/^#+\s*/, "")}
        </div>
      );
    } else if (line.startsWith("- ")) {
      (list = list || []).push(<li key={key++}>{inline(line.slice(2))}</li>);
    } else {
      flush();
      blocks.push(
        <p key={key++} className="my-0.5">
          {inline(line)}
        </p>
      );
    }
  });
  flush();

  return <div className="flex flex-col gap-1.5">{blocks}</div>;
}
