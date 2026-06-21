"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePeriodReview } from "@/lib/review/actions";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export type ReviewFields = {
  goal: string;
  wentWell: string;
  couldImprove: string;
  nextActions: string;
};

export function PeriodReflection({
  periodType,
  periodStart,
  initial,
}: {
  periodType: PeriodType;
  periodStart: string;
  initial: ReviewFields;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ReviewFields>(initial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const goalLabel = periodType === "WEEK" ? "週間目標" : "月間目標";

  function set(key: keyof ReviewFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const r = await savePeriodReview({ periodType, periodStart, ...fields });
      setMessage(r.ok ? "保存しました" : r.error);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Block label={goalLabel}>
        <textarea
          value={fields.goal}
          onChange={(e) => set("goal", e.target.value)}
          rows={2}
          placeholder={`この${periodType === "WEEK" ? "週" : "月"}の目標`}
          className={areaCls}
        />
      </Block>
      <Block label="うまくできたこと">
        <textarea value={fields.wentWell} onChange={(e) => set("wentWell", e.target.value)} rows={3} className={areaCls} />
      </Block>
      <Block label="もっと改善できたこと">
        <textarea value={fields.couldImprove} onChange={(e) => set("couldImprove", e.target.value)} rows={3} className={areaCls} />
      </Block>
      <Block label="次のサイクルで取り組むこと">
        <textarea value={fields.nextActions} onChange={(e) => set("nextActions", e.target.value)} rows={3} className={areaCls} />
      </Block>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="self-start rounded bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {isPending ? "保存中…" : "保存"}
        </button>
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

const areaCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm leading-relaxed outline-none focus:border-zinc-500";
