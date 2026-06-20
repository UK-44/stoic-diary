"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveComponent } from "@/lib/admin/actions";
import type { ComponentType } from "@/lib/diary/types";

export type OrderRow = { id: string; name: string; type: ComponentType };

const TYPE_LABEL: Record<ComponentType, string> = {
  FIXED_MESSAGE: "固定メッセージ",
  BULLET_LIST: "箇条書きリスト",
  GROUPED_LIST: "グループ付きリスト",
};

/** コンポーネントの並び替え（マスタ定義は変更不可・順序のみ）。 */
export function ComponentOrderList({ components }: { components: OrderRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const r = await moveComponent(id, direction);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {components.map((c, i) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          <div className="flex flex-col">
            <span>{c.name}</span>
            <span className="text-xs text-zinc-500">{TYPE_LABEL[c.type]}</span>
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => move(c.id, "up")}
              disabled={isPending || i === 0}
              aria-label="上へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              onClick={() => move(c.id, "down")}
              disabled={isPending || i === components.length - 1}
              aria-label="下へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
