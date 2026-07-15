"use client";

import { useEffect, useRef, useState } from "react";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

interface SyncResponse {
  content: string;
  version: number;
  updatedByName: string | null;
  updatedAtLabel: string | null;
}

// 커서 위치를 텍스트 변경에 맞춰 이동
function transformCursor(oldText: string, newText: string, pos: number) {
  const diffs = dmp.diff_main(oldText, newText);
  let oldIdx = 0;
  let newIdx = 0;
  for (const [op, data] of diffs) {
    if (op === 0) {
      // 동일 구간
      if (oldIdx + data.length >= pos) return newIdx + (pos - oldIdx);
      oldIdx += data.length;
      newIdx += data.length;
    } else if (op === -1) {
      // 삭제된 구간
      if (oldIdx + data.length >= pos) return newIdx;
      oldIdx += data.length;
    } else {
      // 삽입된 구간
      newIdx += data.length;
    }
  }
  return Math.min(newIdx, newText.length);
}

// 모둠 공유 메모장: diff 패치를 2초 간격으로 서버와 병합
export function MemoEditor({
  groupId,
  initialContent,
  initialVersion,
  readOnly = false,
  endpoint,
}: {
  groupId: string;
  initialContent: string;
  initialVersion: number;
  readOnly?: boolean;
  endpoint?: string; // 기본: 스터디 모둠 메모 API
}) {
  const apiUrl = endpoint ?? `/api/group-memo/${groupId}`;
  const [text, setText] = useState(initialContent);
  const [meta, setMeta] = useState<{ by: string | null; at: string | null }>({
    by: null,
    at: null,
  });
  const [syncing, setSyncing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text; // eslint-disable-line react-hooks/refs
  const shadowRef = useRef(initialContent);
  const [shadowState, setShadowState] = useState(initialContent); // dirty 표시용
  const versionRef = useRef(initialVersion);
  const inflightRef = useRef(false);

  const applyRemote = (newText: string) => {
    const ta = taRef.current;
    const oldText = textRef.current;
    if (newText === oldText) return;
    const selStart = ta ? transformCursor(oldText, newText, ta.selectionStart) : 0;
    const selEnd = ta ? transformCursor(oldText, newText, ta.selectionEnd) : 0;
    setText(newText);
    requestAnimationFrame(() => {
      if (ta && document.activeElement === ta) ta.setSelectionRange(selStart, selEnd);
    });
  };

  const sync = async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const local = textRef.current;
      if (!readOnly && local !== shadowRef.current) {
        // 내 변경분을 패치로 전송 → 서버가 다른 모둠원의 내용과 병합
        setSyncing(true);
        const patchText = dmp.patch_toText(dmp.patch_make(shadowRef.current, local));
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patchText }),
        });
        if (!res.ok) return;
        const data: SyncResponse = await res.json();
        shadowRef.current = data.content;
        setShadowState(data.content);
        versionRef.current = data.version;
        setMeta({ by: data.updatedByName, at: data.updatedAtLabel });
        // 전송 중 입력한 내용을 서버 결과 위에 재적용
        const during = dmp.patch_make(local, textRef.current);
        const [merged] = dmp.patch_apply(during, data.content);
        applyRemote(merged);
      } else {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) return;
        const data: SyncResponse = await res.json();
        if (data.version !== versionRef.current) {
          versionRef.current = data.version;
          setMeta({ by: data.updatedByName, at: data.updatedAtLabel });
          if (textRef.current === shadowRef.current) {
            shadowRef.current = data.content;
            setShadowState(data.content);
            applyRemote(data.content);
          }
        }
      }
    } catch {
      // 일시적 네트워크 오류는 다음 주기에 회복
    } finally {
      inflightRef.current = false;
      setSyncing(false);
    }
  };

  const syncRef = useRef(sync);
  syncRef.current = sync; // eslint-disable-line react-hooks/refs

  useEffect(() => {
    const t = setInterval(() => syncRef.current(), 2000);
    return () => clearInterval(t);
  }, []);

  // 입력 후 700ms 디바운스 저장
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (v: string) => {
    setText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => syncRef.current(), 700);
  };

  const dirty = text !== shadowState;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          readOnly
            ? "아직 작성된 내용이 없습니다."
            : "모둠원과 함께 쓰는 메모장입니다.\n회의 내용, 역할 분담, 아이디어를 자유롭게 남겨보세요."
        }
        readOnly={readOnly}
        spellCheck={false}
        className={`min-h-[420px] resize-y rounded-[14px] border border-line p-6 text-[13.5px] leading-[1.8] text-stone-800 ${
          readOnly ? "bg-paper" : "bg-white"
        }`}
      />
      <div className="flex items-center justify-between text-[11.5px] text-stone-400">
        <span>
          {readOnly ? (
            "읽기 전용 — 내 모둠 메모장만 편집할 수 있습니다"
          ) : (
            <>
              {syncing || dirty ? "동기화 중…" : "✓ 저장됨"}
              <span className="ml-2 text-stone-300">2초마다 모둠원과 자동 동기화됩니다</span>
            </>
          )}
        </span>
        {meta.at && (
          <span>
            마지막 수정 {meta.by ? `${meta.by} · ` : ""}
            {meta.at}
          </span>
        )}
      </div>
    </div>
  );
}
