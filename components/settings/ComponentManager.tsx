"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createComponent,
  moveComponent,
  setComponentArchived,
  updateComponent,
} from "@/lib/settings/actions";
import type { ComponentType } from "@/lib/diary/types";

export type ComponentRow = {
  id: string;
  name: string;
  type: ComponentType;
  placeholder: string;
  groups: string[];
  message: string;
  archived: boolean;
};

// テンプレ（種類）は固定。名前と並び順・取捨はユーザーが決める。
const TEMPLATES: { type: ComponentType; label: string; hint: string }[] = [
  { type: "RICH_TEXT", label: "フリー", hint: "自由記述（箇条書き・太字など）" },
  { type: "LABELED_TEXT", label: "ラベル付き", hint: "見出しに紐づく入力（例: Good / Bad）" },
  { type: "FIXED_MESSAGE", label: "固定メッセージ", hint: "毎日表示する自分宛のメッセージ" },
];
const TYPE_LABEL: Record<ComponentType, string> = {
  RICH_TEXT: "フリー",
  LABELED_TEXT: "ラベル付き",
  FIXED_MESSAGE: "固定メッセージ",
};

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

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok = "保存しました") {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? ok : r.error ?? "失敗しました");
      if (r.ok) router.refresh();
    });
  }

  function handleCreate() {
    run(
      () =>
        createComponent(type, {
          name,
          placeholder: type === "RICH_TEXT" ? placeholder : undefined,
          groups: type === "LABELED_TEXT" ? splitGroups(groups) : undefined,
          message: type === "FIXED_MESSAGE" ? fixedMsg : undefined,
        }),
      "追加しました",
    );
    setName("");
    setFixedMsg("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 追加 */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-semibold">項目を追加</h3>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
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
          {type === "RICH_TEXT" && (
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="プレースホルダ（任意）"
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
        </div>
        <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
          追加
        </button>
      </div>

      {/* 一覧 */}
      <div className="flex flex-col gap-2">
        {components.map((c, i) => (
          <ComponentItem
            key={c.id}
            component={c}
            isFirst={i === 0}
            isLast={i === components.length - 1}
            onRun={run}
            disabled={isPending}
            typeLabel={TYPE_LABEL[c.type]}
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
}: {
  component: ComponentRow;
  isFirst: boolean;
  isLast: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
  disabled: boolean;
  typeLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(component.name);
  const [placeholder, setPlaceholder] = useState(component.placeholder);
  const [groups, setGroups] = useState(component.groups.join(", "));
  const [fixedMsg, setFixedMsg] = useState(component.message);

  return (
    <div
      className={`rounded-lg border p-3 ${
        component.archived ? "border-zinc-800 bg-zinc-900/20" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              onClick={() => onRun(() => moveComponent(component.id, "up"))}
              disabled={disabled || isFirst || component.archived}
              aria-label="上へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              onClick={() => onRun(() => moveComponent(component.id, "down"))}
              disabled={disabled || isLast || component.archived}
              aria-label="下へ"
              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
            >
              ▼
            </button>
          </div>
          <div className="flex flex-col">
            <span className={component.archived ? "text-zinc-500 line-through" : ""}>
              {component.name}
            </span>
            <span className="text-xs text-zinc-500">
              {typeLabel}
              {component.archived && " · 非表示"}
            </span>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => setEditing((v) => !v)} className="text-zinc-400 hover:text-zinc-100">
            {editing ? "閉じる" : "編集"}
          </button>
          <button
            onClick={() => onRun(() => setComponentArchived(component.id, !component.archived))}
            disabled={disabled}
            className="text-zinc-400 hover:text-zinc-100"
          >
            {component.archived ? "使う" : "外す"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="項目名" className={inputCls} />
          {component.type === "RICH_TEXT" && (
            <input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder="プレースホルダ" className={inputCls} />
          )}
          {component.type === "LABELED_TEXT" && (
            <input value={groups} onChange={(e) => setGroups(e.target.value)} placeholder="ラベル（カンマ区切り）" className={inputCls} />
          )}
          {component.type === "FIXED_MESSAGE" && (
            <textarea value={fixedMsg} onChange={(e) => setFixedMsg(e.target.value)} rows={2} placeholder="固定メッセージ" className={inputCls} />
          )}
          <button
            onClick={() =>
              onRun(() =>
                updateComponent(component.id, {
                  name,
                  placeholder: component.type === "RICH_TEXT" ? placeholder : undefined,
                  groups: component.type === "LABELED_TEXT" ? splitGroups(groups) : undefined,
                  message: component.type === "FIXED_MESSAGE" ? fixedMsg : undefined,
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
