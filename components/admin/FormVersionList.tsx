"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFormVersion } from "@/lib/admin/actions";

export type FormVersionRow = {
  id: string;
  name: string;
  effectiveFrom: string; // YYYY-MM-DD
  itemCount: number;
};

export function FormVersionList({ versions }: { versions: FormVersionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleCreate() {
    setMessage(null);
    startTransition(async () => {
      const r = await createFormVersion({ name, effectiveFrom });
      setMessage(r.ok ? "作成しました" : r.error);
      if (r.ok) {
        setName("");
        setEffectiveFrom("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold">構成版を追加</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="版の名前（例: 2026年版）"
            className={inputCls}
          />
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className={inputCls}
          />
        </div>
        <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
          追加
        </button>
        {message && <p className="text-sm text-zinc-400">{message}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">構成版一覧（有効開始日の新しい順）</h2>
        {versions.map((v) => (
          <Link
            key={v.id}
            href={`/admin/forms/${v.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-600"
          >
            <div className="flex flex-col">
              <span>{v.name}</span>
              <span className="text-xs text-zinc-500">
                {v.effectiveFrom} から有効 · {v.itemCount} 項目
              </span>
            </div>
            <span className="text-xs text-zinc-500">編集 →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

const inputCls =
  "rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500";
const btnPrimary =
  "self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50";
