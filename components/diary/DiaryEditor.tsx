"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDiaryEntry } from "@/lib/diary/actions";
import {
  emptyValueFor,
  type BulletListConfig,
  type ComponentValue,
  type GroupedListConfig,
  type ResolvedComponent,
  type ResolvedForm,
} from "@/lib/diary/types";
import { BulletList } from "./fields/BulletList";
import { GroupedList } from "./fields/GroupedList";
import { FixedMessage } from "./fields/FixedMessage";

type Props = {
  dateKey: string;
  form: ResolvedForm;
  initialGoal: string;
  initialRating: number | null;
  /** その日に既にエントリがあるか（未記入なら「日記を書く」から開始） */
  existing: boolean;
};

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "素晴らしい"];
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function DiaryEditor({ dateKey, form, initialGoal, initialRating, existing }: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(existing);
  const [goal, setGoal] = useState(initialGoal);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [values, setValues] = useState<Record<string, ComponentValue>>(() =>
    initValues(form.components),
  );
  const [status, setStatus] = useState<SaveStatus>("idle");

  const dirty = useRef(false);
  const refreshed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 変更があれば 800ms デバウンスで自動保存する。
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, rating, values]);

  async function save() {
    setStatus("saving");
    const payload = form.components
      .filter((c) => c.type !== "FIXED_MESSAGE")
      .map((c) => ({ componentId: c.componentId, value: values[c.componentId] }));
    const r = await saveDiaryEntry({
      dateKey,
      formVersionId: form.formVersionId,
      goal,
      rating,
      values: payload,
    });
    setStatus(r.ok ? "saved" : "error");
    // 新規エントリ作成時は週ストリップの記入済み表示を更新する。
    if (r.ok && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }

  function markDirty() {
    dirty.current = true;
  }

  function setValue(componentId: string, next: ComponentValue) {
    markDirty();
    setValues((prev) => ({ ...prev, [componentId]: next }));
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-zinc-500">この日の日記はまだありません。</p>
        <button
          onClick={() => {
            setStarted(true);
            markDirty();
            save();
          }}
          className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          日記を書く
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* コア: 目標（インライン） */}
      <Field label="目標">
        <input
          type="text"
          value={goal}
          onChange={(e) => {
            markDirty();
            setGoal(e.target.value);
          }}
          placeholder="今日の目標を書く…"
          className="w-full border-none bg-transparent text-base outline-none placeholder:text-zinc-600"
        />
      </Field>

      {/* コア: 総合評価（4 段階） */}
      <Field label="総合評価">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                markDirty();
                setRating(rating === n ? null : n);
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                rating === n
                  ? "border-zinc-300 bg-zinc-200 text-zinc-900"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {RATING_LABELS[n]}
            </button>
          ))}
        </div>
      </Field>

      {/* 可動コンポーネント */}
      {form.components.map((c) => (
        <Field key={c.componentId} label={c.name}>
          {renderComponent(c, values[c.componentId], (next) => setValue(c.componentId, next))}
        </Field>
      ))}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </h2>
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
