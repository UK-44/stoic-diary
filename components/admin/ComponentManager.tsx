"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createComponent,
  moveComponent,
  setComponentArchived,
  updateComponent,
} from "@/lib/admin/actions";
import type { ComponentType } from "@/lib/diary/types";

export type ComponentRow = {
  id: string;
  key: string;
  name: string;
  type: ComponentType;
  placeholder: string;
  groups: string[];
  archived: boolean;
};

const TYPE_LABEL: Record<ComponentType, string> = {
  FIXED_MESSAGE: "固定メッセージ",
  BULLET_LIST: "箇条書きリスト",
  GROUPED_LIST: "グループ付きリスト",
};

export function ComponentManager({ components }: { components: ComponentRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // 新規作成フォームの状態（key は自動採番のため入力しない）
  const [name, setName] = useState("");
  const [type, setType] = useState<ComponentType>("BULLET_LIST");
  const [placeholder, setPlaceholder] = useState("");
  const [groups, setGroups] = useState("Good, Bad");

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
        createComponent({
          name,
          type,
          placeholder: type === "BULLET_LIST" ? placeholder : undefined,
          groups: type === "GROUPED_LIST" ? splitGroups(groups) : undefined,
        }),
      "作成しました",
    );
    setName("");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold">コンポーネントを追加</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前（表示名）"
            className={inputCls}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ComponentType)}
            className={inputCls}
          >
            {Object.entries(TYPE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          {type === "BULLET_LIST" && (
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="プレースホルダ（任意）"
              className={inputCls}
            />
          )}
          {type === "GROUPED_LIST" && (
            <input
              value={groups}
              onChange={(e) => setGroups(e.target.value)}
              placeholder="グループ（カンマ区切り）"
              className={inputCls}
            />
          )}
        </div>
        <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
          追加
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">一覧（上から表示順。▲▼で並び替え）</h2>
        {components.map((c, i) => (
          <ComponentItem
            key={c.id}
            component={c}
            isFirst={i === 0}
            isLast={i === components.length - 1}
            onRun={run}
            disabled={isPending}
          />
        ))}
      </section>

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
}: {
  component: ComponentRow;
  isFirst: boolean;
  isLast: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(component.name);
  const [placeholder, setPlaceholder] = useState(component.placeholder);
  const [groups, setGroups] = useState(component.groups.join(", "));

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
            <span className={component.archived ? "text-zinc-500 line-through" : ""}>
              {component.name}
            </span>
            <span className="text-xs text-zinc-500">
              {TYPE_LABEL[component.type]}
              {component.archived && " · アーカイブ済"}
            </span>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => setEditing((v) => !v)} className="text-zinc-400 hover:text-zinc-100">
            {editing ? "閉じる" : "編集"}
          </button>
          <button
            onClick={() =>
              onRun(() => setComponentArchived(component.id, !component.archived))
            }
            disabled={disabled}
            className="text-zinc-400 hover:text-zinc-100"
          >
            {component.archived ? "復活" : "アーカイブ"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          {component.type === "BULLET_LIST" && (
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="プレースホルダ"
              className={inputCls}
            />
          )}
          {component.type === "GROUPED_LIST" && (
            <input
              value={groups}
              onChange={(e) => setGroups(e.target.value)}
              placeholder="グループ（カンマ区切り）"
              className={inputCls}
            />
          )}
          <button
            onClick={() =>
              onRun(() =>
                updateComponent(component.id, {
                  name,
                  placeholder: component.type === "BULLET_LIST" ? placeholder : undefined,
                  groups: component.type === "GROUPED_LIST" ? splitGroups(groups) : undefined,
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
  return s
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g !== "");
}

const inputCls =
  "rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500";
const btnPrimary =
  "self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50";
