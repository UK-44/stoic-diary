"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIdea, deleteIdea, updateIdea } from "@/lib/idea/actions";
import { RichTextEditor } from "@/components/diary/fields/RichTextEditor";
import { StarRating } from "./StarRating";
import type { IdeaLabel } from "@/lib/generated/prisma/enums";

const LABELS: { value: IdeaLabel; text: string }[] = [
  { value: "FAMILY", text: "家族" },
  { value: "WORK", text: "仕事" },
  { value: "MAN", text: "Man" },
];

export type IdeaFormValue = {
  id?: string;
  title: string;
  content: string;
  rating: number;
  label: IdeaLabel | null;
};

export function IdeaForm({ initial }: { initial?: IdeaFormValue }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [label, setLabel] = useState<IdeaLabel | null>(initial?.label ?? null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      if (editing && initial?.id) {
        const r = await updateIdea(initial.id, { title, content, rating, label });
        setMessage(r.ok ? "保存しました" : r.error);
        if (r.ok) router.refresh();
      } else {
        const r = await createIdea({ title, content, rating, label });
        if (r.ok) router.push(`/idea/${r.id}`);
        else setMessage(r.error);
      }
    });
  }

  function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("このアイデアを削除しますか？")) return;
    startTransition(async () => {
      const r = await deleteIdea(initial.id!);
      if (r.ok) router.push("/idea");
      else setMessage(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="見出し"
        className="w-full border-none bg-transparent text-lg font-semibold outline-none placeholder:text-zinc-600"
      />

      <div className="flex flex-wrap items-center gap-4">
        <StarRating value={rating} onChange={setRating} />
        <LabelPicker value={label} onChange={setLabel} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
        <RichTextEditor value={initial?.content ?? ""} placeholder="メモ（自由記述）" onChange={setContent} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {isPending ? "保存中…" : editing ? "保存" : "追加"}
        </button>
        {editing && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded border border-zinc-700 px-4 py-2 text-sm text-red-400 hover:bg-zinc-900"
          >
            削除
          </button>
        )}
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>
    </div>
  );
}

function LabelPicker({
  value,
  onChange,
}: {
  value: IdeaLabel | null;
  onChange: (next: IdeaLabel | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {LABELS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => onChange(value === l.value ? null : l.value)}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            value === l.value
              ? "bg-zinc-200 text-zinc-900"
              : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {l.text}
        </button>
      ))}
    </div>
  );
}
