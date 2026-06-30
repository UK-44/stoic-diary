"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createComponent,
  deleteComponent,
  moveComponent,
  reorderComponents,
  updateComponent,
} from "@/lib/settings/actions";
import {
  HABIT_DIFFICULTY_LABEL,
  HABIT_TARGET_DAYS,
  type ComponentType,
  type HabitDifficulty,
  type HabitItem,
} from "@/lib/diary/types";

export type ComponentRow = {
  id: string;
  name: string;
  type: ComponentType;
  placeholder: string;
  groups: string[];
  message: string;
  habits: HabitItem[];
};

// テンプレ（種類）は固定。名前と並び順はユーザーが決める。不要なら削除する。
const TEMPLATES: { type: ComponentType; label: string; hint: string }[] = [
  { type: "RICH_TEXT", label: "フリー", hint: "自由記述（箇条書き・太字など）" },
  { type: "LABELED_TEXT", label: "ラベル付き", hint: "見出しに紐づく入力（例: Good / Bad）" },
  { type: "CHECKBOX_LIST", label: "チェックリスト", hint: "その日の項目を追加してチェック" },
  { type: "HABIT", label: "習慣", hint: "目標日数までチェックを積み上げる" },
  { type: "FIXED_MESSAGE", label: "固定メッセージ", hint: "毎日表示する自分宛のメッセージ" },
];
const TYPE_LABEL: Record<ComponentType, string> = {
  RICH_TEXT: "フリー",
  LABELED_TEXT: "ラベル付き",
  CHECKBOX_LIST: "チェックリスト",
  HABIT: "習慣",
  FIXED_MESSAGE: "固定メッセージ",
};
const DIFFICULTIES: HabitDifficulty[] = ["EASY", "NORMAL", "HARD"];

/** 難易度を 3 段階のボタンで選ぶ。 */
function DifficultyPicker({
  value,
  onChange,
}: {
  value: HabitDifficulty;
  onChange: (next: HabitDifficulty) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`rounded-lg border p-2 text-center text-xs transition-colors ${
            value === d
              ? "border-zinc-300 bg-zinc-800"
              : "border-zinc-800 hover:border-zinc-600"
          }`}
        >
          <div className="font-medium">{HABIT_DIFFICULTY_LABEL[d]}</div>
          <div className="mt-0.5 text-zinc-500">{HABIT_TARGET_DAYS[d]}日</div>
        </button>
      ))}
    </div>
  );
}

function newHabit(): HabitItem {
  return { id: crypto.randomUUID(), name: "", difficulty: "NORMAL" };
}

/** 1 つの習慣コンポーネント内の、複数の習慣（名前＋難易度）を編集する。 */
function HabitsEditor({
  value,
  onChange,
}: {
  value: HabitItem[];
  onChange: (next: HabitItem[]) => void;
}) {
  const habits = value;

  const update = (i: number, patch: Partial<HabitItem>) =>
    onChange(habits.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) => onChange(habits.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {habits.map((h, i) => (
        <div key={h.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3">
          <div className="flex items-center gap-2">
            <input
              value={h.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="習慣名（例: 毎朝ストレッチ）"
              className={`flex-1 ${inputCls}`}
            />
            {habits.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="この習慣を削除"
                className="shrink-0 px-1 text-zinc-600 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
          <DifficultyPicker
            value={h.difficulty}
            onChange={(d) => update(i, { difficulty: d })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...habits, newHabit()])}
        className="self-start text-xs text-zinc-400 hover:text-zinc-100"
      >
        ＋ 習慣を追加
      </button>
    </div>
  );
}

export function ComponentManager({ components }: { components: ComponentRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // 追加フォーム
  const [type, setType] = useState<ComponentType>("RICH_TEXT");
  const [name, setName] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [groups, setGroups] = useState("Good, Bad");
  const [fixedMsg, setFixedMsg] = useState("");
  const [habits, setHabits] = useState<HabitItem[]>(() => [newHabit()]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok = "保存しました") {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? ok : r.error ?? "失敗しました");
      if (r.ok) router.refresh();
    });
  }

  // ドラッグ並び替え用のローカル順序。作成/削除でサーバ側が変わったら同期する
  // （props 変更時に描画中へ反映する React 公式パターン。effect は使わない）。
  const [items, setItems] = useState(components);
  const [syncedFrom, setSyncedFrom] = useState(components);
  if (syncedFrom !== components) {
    setSyncedFrom(components);
    setItems(components);
  }
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    dragId.current = id;
    setDraggingId(id);
  }
  // ドラッグ中のホバー先へ即時に並べ替える（楽観更新）。
  function handleDragEnter(overId: string) {
    const fromId = dragId.current;
    if (!fromId || fromId === overId) return;
    setItems((prev) => {
      const from = prev.findIndex((c) => c.id === fromId);
      const to = prev.findIndex((c) => c.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  function handleDragEnd() {
    dragId.current = null;
    setDraggingId(null);
    const ids = items.map((c) => c.id);
    // 並びが変わっていなければ保存しない。
    if (ids.join() === components.map((c) => c.id).join()) return;
    run(() => reorderComponents(ids), "並び替えました");
  }

  function handleCreate() {
    run(
      () =>
        createComponent(type, {
          name,
          placeholder:
            type === "RICH_TEXT" || type === "CHECKBOX_LIST" ? placeholder : undefined,
          groups: type === "LABELED_TEXT" ? splitGroups(groups) : undefined,
          message: type === "FIXED_MESSAGE" ? fixedMsg : undefined,
          habits: type === "HABIT" ? habits : undefined,
        }),
      "追加しました",
    );
    setName("");
    setFixedMsg("");
    setHabits([newHabit()]);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 追加 */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-semibold">項目を追加</h3>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setType(t.type)}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  type === t.type
                    ? "border-zinc-300 bg-zinc-800"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="mt-0.5 text-zinc-500">{t.hint}</div>
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="項目名（例: 今日にかける想い）"
            className={inputCls}
          />
          {(type === "RICH_TEXT" || type === "CHECKBOX_LIST") && (
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder={
                type === "CHECKBOX_LIST"
                  ? "項目追加欄のプレースホルダ（任意）"
                  : "プレースホルダ（任意）"
              }
              className={inputCls}
            />
          )}
          {type === "LABELED_TEXT" && (
            <input
              value={groups}
              onChange={(e) => setGroups(e.target.value)}
              placeholder="ラベル（カンマ区切り 例: Good, Bad）"
              className={inputCls}
            />
          )}
          {type === "FIXED_MESSAGE" && (
            <textarea
              value={fixedMsg}
              onChange={(e) => setFixedMsg(e.target.value)}
              rows={2}
              placeholder="表示する固定メッセージ"
              className={inputCls}
            />
          )}
          {type === "HABIT" && <HabitsEditor value={habits} onChange={setHabits} />}
        </div>
        <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
          追加
        </button>
      </div>

      {/* 一覧（グリップをドラッグして並び替え。▲▼ でも移動可） */}
      <div className="flex flex-col gap-2">
        {items.map((c, i) => (
          <ComponentItem
            key={c.id}
            component={c}
            isFirst={i === 0}
            isLast={i === items.length - 1}
            onRun={run}
            disabled={isPending}
            typeLabel={TYPE_LABEL[c.type]}
            isDragging={draggingId === c.id}
            onDragStart={() => handleDragStart(c.id)}
            onDragEnter={() => handleDragEnter(c.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}

function ComponentItem({
  component,
  isFirst,
  isLast,
  onRun,
  disabled,
  typeLabel,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  component: ComponentRow;
  isFirst: boolean;
  isLast: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
  disabled: boolean;
  typeLabel: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // グリップを掴んだ時だけ行をドラッグ可能にする（入力欄の選択を妨げない）。
  const [armed, setArmed] = useState(false);
  const [name, setName] = useState(component.name);
  const [placeholder, setPlaceholder] = useState(component.placeholder);
  const [groups, setGroups] = useState(component.groups.join(", "));
  const [fixedMsg, setFixedMsg] = useState(component.message);
  const [habits, setHabits] = useState<HabitItem[]>(() =>
    component.habits.length > 0 ? component.habits : [newHabit()],
  );

  function handleDelete() {
    if (
      !window.confirm(
        `「${component.name}」を削除します。\nこの項目に紐づく日記の入力データもすべて削除されます。よろしいですか？`,
      )
    )
      return;
    onRun(() => deleteComponent(component.id), "削除しました");
  }

  return (
    <div
      draggable={armed}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd();
      }}
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* ドラッグ用グリップ */}
          <span
            role="button"
            aria-label="ドラッグして並び替え"
            onMouseDown={() => setArmed(true)}
            onTouchStart={() => setArmed(true)}
            className="cursor-grab select-none px-1 text-zinc-600 hover:text-zinc-300 active:cursor-grabbing"
          >
            ⠿
          </span>
          <div className="flex flex-col">
            <button
              onClick={() => onRun(() => moveComponent(component.id, "up"))}
              disabled={disabled || isFirst}
              aria-label="上へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              onClick={() => onRun(() => moveComponent(component.id, "down"))}
              disabled={disabled || isLast}
              aria-label="下へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▼
            </button>
          </div>
          <div className="flex flex-col">
            <span>{component.name}</span>
            <span className="text-xs text-zinc-500">{typeLabel}</span>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => setEditing((v) => !v)} className="text-zinc-400 hover:text-zinc-100">
            {editing ? "閉じる" : "編集"}
          </button>
          <button
            onClick={handleDelete}
            disabled={disabled}
            className="text-red-400 hover:text-red-300"
          >
            削除
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="項目名" className={inputCls} />
          {(component.type === "RICH_TEXT" || component.type === "CHECKBOX_LIST") && (
            <input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder="プレースホルダ" className={inputCls} />
          )}
          {component.type === "LABELED_TEXT" && (
            <input value={groups} onChange={(e) => setGroups(e.target.value)} placeholder="ラベル（カンマ区切り）" className={inputCls} />
          )}
          {component.type === "FIXED_MESSAGE" && (
            <textarea value={fixedMsg} onChange={(e) => setFixedMsg(e.target.value)} rows={2} placeholder="固定メッセージ" className={inputCls} />
          )}
          {component.type === "HABIT" && (
            <HabitsEditor value={habits} onChange={setHabits} />
          )}
          <button
            onClick={() =>
              onRun(() =>
                updateComponent(component.id, {
                  name,
                  placeholder:
                    component.type === "RICH_TEXT" || component.type === "CHECKBOX_LIST"
                      ? placeholder
                      : undefined,
                  groups: component.type === "LABELED_TEXT" ? splitGroups(groups) : undefined,
                  message: component.type === "FIXED_MESSAGE" ? fixedMsg : undefined,
                  habits: component.type === "HABIT" ? habits : undefined,
                }),
              )
            }
            disabled={disabled}
            className={btnPrimary}
          >
            更新
          </button>
        </div>
      )}
    </div>
  );
}

function splitGroups(s: string): string[] {
  return s.split(",").map((g) => g.trim()).filter((g) => g !== "");
}

const inputCls =
  "rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500";
const btnPrimary =
  "self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50";
