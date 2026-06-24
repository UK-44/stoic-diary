"use client";

import { useEffect, useRef, useState } from "react";
import { savePeriodReview } from "@/lib/review/actions";
import { RichTextEditor } from "@/components/diary/fields/RichTextEditor";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export type ReviewFields = {
  goal: string;
  wentWell: string;
  couldImprove: string;
  nextActions: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function PeriodReflection({
  periodType,
  periodStart,
  initial,
}: {
  periodType: PeriodType;
  periodStart: string;
  initial: ReviewFields;
}) {
  const [fields, setFields] = useState<ReviewFields>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goalLabel = periodType === "WEEK" ? "週間目標" : "月間目標";

  async function save() {
    setStatus("saving");
    const r = await savePeriodReview({ periodType, periodStart, ...fields });
    setStatus(r.ok ? "saved" : "error");
  }

  // 変更があれば 800ms デバウンスで自動保存する。
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  function set(key: keyof ReviewFields, value: string) {
    dirty.current = true;
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Block label={goalLabel}>
        <Field
          value={initial.goal}
          placeholder={`この${periodType === "WEEK" ? "週" : "月"}の目標`}
          onChange={(html) => set("goal", html)}
        />
      </Block>
      <Block label="うまくできたこと">
        <Field value={initial.wentWell} onChange={(html) => set("wentWell", html)} />
      </Block>
      <Block label="もっと改善できたこと">
        <Field value={initial.couldImprove} onChange={(html) => set("couldImprove", html)} />
      </Block>
      <Block label="次のサイクルで取り組むこと">
        <Field value={initial.nextActions} onChange={(html) => set("nextActions", html)} />
      </Block>

      <SaveIndicator status={status} />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const text =
    status === "saving"
      ? "保存中…"
      : status === "saved"
        ? "保存済み"
        : status === "error"
          ? "保存に失敗しました"
          : "";
  return (
    <p className={`text-xs ${status === "error" ? "text-red-400" : "text-zinc-600"}`}>
      {text}
    </p>
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

/** review 各項目のリッチテキスト入力（diary と同じ TipTap エディタ・HTML 保存）。 */
function Field({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (html: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 focus-within:border-zinc-500">
      <RichTextEditor value={value} placeholder={placeholder} onChange={onChange} />
    </div>
  );
}
