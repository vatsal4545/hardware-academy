"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";

export interface ControllerEditorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  rows?: number;
}

/** A plain monospace code box. Tab inserts two spaces; Esc then Tab moves focus on, so the
 *  editor never traps keyboard users. */
export function ControllerEditor({ value, onChange, label = "Controller code (JavaScript)", rows = 18 }: ControllerEditorProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<{ caret: number; value: string } | null>(null);
  const releaseTab = useRef(false);

  // After a Tab edit the controlled value is replaced, which moves the caret to the end; put it back.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    const pending = pendingCaret.current;
    if (!el || !pending) return;
    if (el.value === pending.value) el.setSelectionRange(pending.caret, pending.caret);
    pendingCaret.current = null;
  });

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      releaseTab.current = true;
      return;
    }
    const plainTab = e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
    if (!plainTab || releaseTab.current) {
      releaseTab.current = false;
      return;
    }
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
    pendingCaret.current = { caret: start + 2, value: next };
    onChange(next);
  };

  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1 block text-muted">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          releaseTab.current = false;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        aria-describedby={hintId}
        className="block w-full resize-y rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-[12.5px] leading-relaxed text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      />
      <p id={hintId} className="mt-1 text-xs text-muted">
        Tab inserts two spaces. Press Esc, then Tab, to move on from the editor.
      </p>
    </div>
  );
}
