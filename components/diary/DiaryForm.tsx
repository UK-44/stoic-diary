"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDiaryEntry } from "@/lib/diary/actions";
import {
  emptyValueFor,
  type ComponentValue,
  type GroupedListConfig,
  type BulletListConfig,
  type ResolvedComponent,
  type ResolvedForm,
} from "@/lib/diary/types";
import { shiftDateKey, todayKey } from "@/lib/date";
import { BulletList } from "./fields/BulletList";
import { GroupedList } from "./fields/GroupedList";
import { FixedMessage } from "./fields/FixedMessage";

type Props = {
  dateKey: string;
  form: ResolvedForm;
  initialGoal: string;
  initialRating: number | null;
};

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "素晴らしい"];

export function DiaryForm({ dateKey, form, initialGoal, initialRating }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [values, setValues] = useState<Record<string, ComponentValue>>(() =>
    initValues(form.components),
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function setValue(componentId: string, next: ComponentValue) {
    setValues((prev) => ({ ...prev, [componentId]: next }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const payload = form.components
        .filter((c) => c.type !== "FIXED_MESSAGE")
        .map((c) => ({ componentId: c.componentId, value: values[c.componentId] }));

      const result = await saveDiaryEntry({
        dateKey,
        formVersionId: form.formVersionId,
        goal,
        rating,
        values: payload,
      });

      setMessage(result.ok ? "保存しました" : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 日付ナビ */}
      <div className="flex items-center justify-between text-sm">
        <a href={`/diary/${shiftDateKey(dateKey, -1)}`} className="text-zinc-400 hover:text-zinc-100">
          ← 前日
        </a>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{dateKey}</h1>
          {dateKey !== todayKey() && (
            <a href={`/diary/${todayKey()}`} className="text-xs text-zinc-500 hover:text-zinc-300">
              今日へ
            </a>
          )}
        </div>
        <a href={`/diary/${shiftDateKey(dateKey, 1)}`} className="text-zinc-400 hover:text-zinc-100">
          翌日 →
        </a>
      </div>

      {/* コア項目: 目標 */}
      <Field label="目標">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="今日の目標"
          className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </Field>

      {/* コア項目: 総合評価（4 段階） */}
      <Field label="総合評価">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? null : n)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                rating === n
                  ? "border-zinc-300 bg-zinc-200 text-zinc-900"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {n}・{RATING_LABELS[n]}
            </button>
          ))}
        </div>
      </Field>

      {/* 可動コンポーネント */}
      {form.components.map((c) => (
        <Field key={c.componentId} label={c.name}>
          {renderComponent(c, values[c.componentId], (next) =>
            setValue(c.componentId, next),
          )}
        </Field>
      ))}

      {/* 保存 */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          {isPending ? "保存中…" : "保存"}
        </button>
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>

      <p className="text-xs text-zinc-600">構成: {form.formVersionName}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-zinc-200">{label}</h2>
      {children}
    </section>
  );
}

function renderComponent(
  c: ResolvedComponent,
  value: ComponentValue,
  onChange: (next: ComponentValue) => void,
) {
  switch (c.type) {
    case "FIXED_MESSAGE":
      return <FixedMessage message={c.message ?? ""} />;
    case "BULLET_LIST":
      return (
        <BulletList
          value={(value as string[]) ?? []}
          placeholder={(c.config as BulletListConfig).placeholder}
          onChange={onChange}
        />
      );
    case "GROUPED_LIST":
      return (
        <GroupedList
          groups={(c.config as GroupedListConfig).groups ?? []}
          value={(value as Record<string, string[]>) ?? {}}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function initValues(components: ResolvedComponent[]): Record<string, ComponentValue> {
  const entries: [string, ComponentValue][] = [];
  for (const c of components) {
    if (c.type === "FIXED_MESSAGE") continue;
    const v = c.value ?? emptyValueFor(c.type, c.config);
    if (v !== null) entries.push([c.componentId, v]);
  }
  return Object.fromEntries(entries);
}
