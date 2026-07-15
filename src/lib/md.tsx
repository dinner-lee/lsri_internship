import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 연구 주제용 마크다운 렌더러 (GFM: 표·취소선·체크리스트·자동 링크 지원)
// react-markdown은 원시 HTML을 렌더링하지 않으므로 XSS에 안전하다.
export function Markdown({ md }: { md: string }) {
  return (
    <div
      className="prose prose-sm prose-stone max-w-none [overflow-wrap:anywhere]
        prose-headings:font-bold prose-headings:tracking-tight
        prose-h1:text-[17px] prose-h2:text-[15.5px] prose-h3:text-[14px]
        prose-p:my-1.5 prose-p:leading-[1.75]
        prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
        prose-a:text-accent prose-a:underline-offset-2 prose-a:break-all
        prose-blockquote:my-2 prose-blockquote:border-l-line prose-blockquote:font-normal prose-blockquote:text-stone-500
        prose-code:rounded prose-code:bg-line-soft prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-stone-900 prose-pre:text-[12px]
        prose-hr:my-3
        prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
        prose-img:my-2 prose-img:rounded-lg"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
