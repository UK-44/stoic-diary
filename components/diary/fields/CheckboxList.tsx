"use client";

import { useState } from "react";
import type { CheckboxListValue } from "@/lib/diary/types";

type Props = {
  value: CheckboxListValue;
  placeholder?: string;
  onChange: (next: CheckboxListValue) => void;
};

/**
 * 毎日その場で項目を追加・チェックする ToDo 型のチェックボックスリスト。
 * 値は [{ text, checked }] の配列。マスタ側に固定項目は持たない。
 */
export function CheckboxList({ value, placeholder, onChange }: Props) {
  const items = value ?? [];
  const [draft, setDraft] = useState("");

  const toggle = (i: number) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, checked: !it.checked } : it)));

  const edit = (i: number, text: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, text } : it)));

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () => {
    const text = draft.trim();
    if (text === "") return;
    onChange([...items, { text, checked: false }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={it.checked}
            onChange={() => toggle(i)}
            className="h-4 w-4 shrink-0 accent-zinc-200"
          />
          <input
            value={it.text}
            onChange={(e) => edit(i, e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${it.checked ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="削除"
            className="shrink-0 px-1 text-zinc-600 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // IME 変換確定の Enter（composition 中）では追加しない。
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "項目を追加"}
          className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </div>
    </div>
  );
}
