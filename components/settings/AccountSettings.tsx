"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLongTermGoal } from "@/lib/settings/actions";
import { logout } from "@/app/login/actions";

export function AccountSettings({
  email,
  initialGoal,
}: {
  email: string;
  initialGoal: string;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const r = await saveLongTermGoal(goal);
      setMessage(r.ok ? "保存しました" : r.error);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-zinc-400">{email}</div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          長期目標
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="長い目で目指したいこと（日々の目標とは別）"
          className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
          >
            保存
          </button>
          {message && <span className="text-sm text-zinc-400">{message}</span>}
        </div>
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
