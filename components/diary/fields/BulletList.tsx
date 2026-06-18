"use client";

import type { BulletListValue } from "@/lib/diary/types";

type Props = {
  value: BulletListValue;
  placeholder?: string;
  onChange: (next: BulletListValue) => void;
};

export function BulletList({ value, placeholder, onChange }: Props) {
  const rows = value.length === 0 ? [""] : value;

  function update(index: number, text: string) {
    const next = [...rows];
    next[index] = text;
    onChange(next);
  }

  function addRow() {
    onChange([...rows, ""]);
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length === 0 ? [] : next);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="select-none text-zinc-600">•</span>
          <input
            type="text"
            value={row}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            aria-label="行を削除"
            className="px-2 text-zinc-600 hover:text-zinc-300"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="self-start text-xs text-zinc-500 hover:text-zinc-300"
      >
        + 追加
      </button>
    </div>
  );
}
