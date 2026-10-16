export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#0d1117]">
      {(title || lang) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted">
          <span>{title ?? ""}</span>
          <span>{lang ?? ""}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-text">
        <code data-lang={lang}>{code}</code>
      </pre>
    </div>
  );
}
