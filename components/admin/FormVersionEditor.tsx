"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFormVersionItems } from "@/lib/admin/actions";
import type { ComponentType } from "@/lib/diary/types";

export type EditorComponent = {
  id: string;
  key: string;
  name: string;
  type: ComponentType;
};

export type EditorItem = {
  componentId: string;
  included: boolean;
  order: number;
  message: string;
};

export function FormVersionEditor({
  formVersionId,
  components,
  initialItems,
}: {
  formVersionId: string;
  components: EditorComponent[];
  initialItems: Record<string, { order: number; message: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [items, setItems] = useState<Record<string, EditorItem>>(() => {
    const map: Record<string, EditorItem> = {};
    components.forEach((c, i) => {
      const existing = initialItems[c.id];
      map[c.id] = {
        componentId: c.id,
        included: existing !== undefined,
        order: existing?.order ?? (i + 1) * 10,
        message: existing?.message ?? "",
      };
    });
    return map;
  });

  function patch(id: string, p: Partial<EditorItem>) {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }

  function handleSave() {
    setMessage(null);
    const payload = components
      .filter((c) => items[c.id].included)
      .map((c) => ({
        componentId: c.id,
        order: items[c.id].order,
        message: items[c.id].message,
      }))
      .sort((a, b) => a.order - b.order);

    startTransition(async () => {
      const r = await saveFormVersionItems(formVersionId, payload);
      setMessage(r.ok ? "保存しました" : r.error);
      if (r.ok) router.refresh();
    });
  }

  // included を order 昇順、未選択を後ろに並べる
  const sorted = [...components].sort((a, b) => {
    const ai = items[a.id].included ? items[a.id].order : Infinity;
    const bi = items[b.id].included ? items[b.id].order : Infinity;
    return ai - bi;
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        この版で使う項目にチェックを入れ、order で並び順を決めます（小さいほど上）。
      </p>
      {sorted.map((c) => {
        const it = items[c.id];
        return (
          <div
            key={c.id}
            className={`rounded-lg border p-3 ${
              it.included ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-900/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={it.included}
                onChange={(e) => patch(c.id, { included: e.target.checked })}
              />
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-zinc-500">{c.key}</span>
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                order
                <input
                  type="number"
                  value={it.order}
                  onChange={(e) => patch(c.id, { order: Number(e.target.value) })}
                  className="w-16 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm"
                />
              </label>
            </div>
            {it.included && c.type === "FIXED_MESSAGE" && (
              <textarea
                value={it.message}
                onChange={(e) => patch(c.id, { message: e.target.value })}
                placeholder="この版で表示する固定メッセージ"
                rows={3}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending} className={btnPrimary}>
          {isPending ? "保存中…" : "構成を保存"}
        </button>
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>
    </div>
  );
}

const btnPrimary =
  "self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50";
