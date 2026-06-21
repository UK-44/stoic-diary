"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIdea, deleteIdea, updateIdea } from "@/lib/idea/actions";
import { RichTextEditor } from "@/components/diary/fields/RichTextEditor";
import { StarRating } from "./StarRating";
import type { IdeaLabel } from "@/lib/generated/prisma/enums";

export type IdeaRow = {
  id: string;
  title: string;
  content: string;
  rating: number;
  label: IdeaLabel | null;
};

const LABELS: { value: IdeaLabel; text: string }[] = [
  { value: "FAMILY", text: "家族" },
  { value: "WORK", text: "仕事" },
  { value: "MAN", text: "Man" },
];
const LABEL_TEXT: Record<IdeaLabel, string> = { FAMILY: "家族", WORK: "仕事", MAN: "Man" };

export function IdeaManager({ ideas }: { ideas: IdeaRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // 追加フォーム
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [label, setLabel] = useState<IdeaLabel | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok = "保存しました") {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? ok : r.error ?? "失敗しました");
      if (r.ok) router.refresh();
    });
  }

  function handleCreate() {
    run(() => createIdea({ title, content, rating, label }), "追加しました");
    setTitle("");
    setContent("");
    setRating(0);
    setLabel(null);
    setEditorKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 追加 */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-semibold">アイデアを追加</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="見出し"
          className={inputCls}
        />
        <div className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
          <RichTextEditor key={editorKey} value="" placeholder="メモ（自由記述）" onChange={setContent} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StarRating value={rating} onChange={setRating} />
          <LabelPicker value={label} onChange={setLabel} />
        </div>
        <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
          追加
        </button>
      </div>

      {/* 一覧 */}
      <div className="flex flex-col gap-2">
        {ideas.length === 0 ? (
          <p className="text-sm text-zinc-500">まだアイデアがありません。</p>
        ) : (
          ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onRun={run} disabled={isPending} labelText={LABEL_TEXT} />
          ))
        )}
      </div>

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}

function IdeaCard({
  idea,
  onRun,
  disabled,
  labelText,
}: {
  idea: IdeaRow;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
  disabled: boolean;
  labelText: Record<IdeaLabel, string>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [content, setContent] = useState(idea.content);
  const [rating, setRating] = useState(idea.rating);
  const [label, setLabel] = useState<IdeaLabel | null>(idea.label);

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="見出し" className={inputCls} />
        <div className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
          <RichTextEditor value={idea.content} placeholder="メモ（自由記述）" onChange={setContent} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StarRating value={rating} onChange={setRating} />
          <LabelPicker value={label} onChange={setLabel} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onRun(() => updateIdea(idea.id, { title, content, rating, label }))}
            disabled={disabled}
            className={btnPrimary}
          >
            更新
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-zinc-400 hover:text-zinc-100">
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{idea.title}</span>
          <div className="flex items-center gap-2">
            <StarRating value={idea.rating} readOnly />
            {idea.label && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {labelText[idea.label]}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-3 text-xs">
          <button onClick={() => setEditing(true)} className="text-zinc-400 hover:text-zinc-100">
            編集
          </button>
          <button
            onClick={() => {
              if (confirm("このアイデアを削除しますか？")) onRun(() => deleteIdea(idea.id), "削除しました");
            }}
            disabled={disabled}
            className="text-red-400 hover:text-red-300"
          >
            削除
          </button>
        </div>
      </div>
      {idea.content && (
        <div className="tiptap text-zinc-300" dangerouslySetInnerHTML={{ __html: idea.content }} />
      )}
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
            value === l.value ? "bg-zinc-200 text-zinc-900" : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {l.text}
        </button>
      ))}
    </div>
  );
}

const inputCls =
  "rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500";
const btnPrimary =
  "self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50";
