"use client";

import type { HabitProgress, HabitValue } from "@/lib/diary/types";

type Props = {
  value: HabitValue;
  habits: HabitProgress[];
  onChange: (next: HabitValue) => void;
};

/**
 * 1 つの「習慣」コンポーネント内の複数の習慣を一覧表示する。
 * その日に達成できたらチェックを入れると残り日数が 1 減る。
 * 残り日数 = 目標日数 − これまでにチェックした日数（当日分を含む）。
 * チェックを外すと 1 日戻る（＝達成できなかった日は減らない）。
 */
export function HabitField({ value, habits, onChange }: Props) {
  if (habits.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        設定 → 日記の構成 から取り組む習慣を追加してください。
      </p>
    );
  }

  const toggle = (id: string, checked: boolean) =>
    onChange({ ...value, [id]: !checked });

  return (
    <div className="flex flex-col gap-2">
      {habits.map((h) => {
        const checked = value?.[h.id] === true;
        const done = h.checkedBefore + (checked ? 1 : 0);
        const remaining = Math.max(0, h.targetDays - done);
        const achieved = remaining === 0;
        return (
          <label
            key={h.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(h.id, checked)}
              className="h-5 w-5 shrink-0 accent-zinc-200"
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-sm ${checked ? "text-zinc-100" : "text-zinc-300"}`}>
                  {h.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {achieved ? (
                    <span className="font-semibold text-emerald-400">目標達成 🎉</span>
                  ) : (
                    <>
                      残り <span className="font-semibold text-zinc-200">{remaining}</span> 日
                    </>
                  )}
                </span>
              </div>
              <ProgressBar done={done} target={h.targetDays} achieved={achieved} />
            </div>
          </label>
        );
      })}
    </div>
  );
}

/** 0 〜 目標日数 の達成度を示すプログレスバー。 */
function ProgressBar({
  done,
  target,
  achieved,
}: {
  done: number;
  target: number;
  achieved: boolean;
}) {
  const pct = target > 0 ? Math.min(100, (done / target) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-zinc-600">0</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            achieved ? "bg-emerald-400" : "bg-zinc-300"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-[10px] tabular-nums text-zinc-600">{target}</span>
    </div>
  );
}
