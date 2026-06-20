"use client";

import type { LabeledTextValue } from "@/lib/diary/types";
import { RichTextEditor } from "./RichTextEditor";

type Props = {
  groups: string[];
  value: LabeledTextValue;
  onChange: (next: LabeledTextValue) => void;
};

/** ラベルに 1:1 で紐づくリッチテキストフィールド群（例: Good / Bad）。 */
export function LabeledText({ groups, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((label) => (
        <div key={label} className="flex flex-col gap-1.5">
          <div className="text-sm font-medium text-zinc-300">{label}</div>
          <RichTextEditor
            value={value[label] ?? ""}
            onChange={(html) => onChange({ ...value, [label]: html })}
          />
        </div>
      ))}
    </div>
  );
}
