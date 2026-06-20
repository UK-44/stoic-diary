"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePeriodReview } from "@/lib/review/actions";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export function PeriodReflection({
  periodType,
  periodStart,
  initialContent,
  longTermGoal,
}: {
  periodType: PeriodType;
  periodStart: string;
  initialContent: string;
  longTermGoal: string | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const r = await savePeriodReview({ periodType, periodStart, content });
      setMessage(r.ok ? "保存しました" : r.error);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {longTermGoal && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">
          <span className="text-xs text-zinc-500">長期目標</span>
          <p className="mt-1 whitespace-pre-line text-zinc-300">{longTermGoal}</p>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder="この期間を振り返って。長期目標に近づけたか、何がうまくいき、何を変えるか…"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm leading-relaxed outline-none focus:border-zinc-500"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="self-start rounded bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {isPending ? "保存中…" : "振り返りを保存"}
        </button>
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>
    </div>
  );
}
