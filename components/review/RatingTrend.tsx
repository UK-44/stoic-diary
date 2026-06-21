import { dayOfMonth } from "@/lib/date";

type Cell = { key: string; rating: number | null };

const RATING_COLOR = [
  "bg-zinc-800", // 0 / null
  "bg-red-500/70", // 1 悪い
  "bg-amber-500/70", // 2 悪くない
  "bg-lime-500/70", // 3 良い
  "bg-emerald-500/80", // 4 最高
];

/** 期間内の総合評価をミニ・ヒートで可視化する。 */
export function RatingTrend({ cells }: { cells: Cell[] }) {
  return (
    <div className="flex items-end gap-1 overflow-x-auto">
      {cells.map((c) => (
        <div key={c.key} className="flex shrink-0 flex-col items-center gap-1">
          <div
            title={`${c.key}${c.rating ? `: ${c.rating}` : ""}`}
            className={`h-8 w-3 rounded-sm ${RATING_COLOR[c.rating ?? 0]}`}
            style={{ opacity: c.rating ? 1 : 0.5 }}
          />
          <span className="text-[9px] text-zinc-600">{dayOfMonth(c.key)}</span>
        </div>
      ))}
    </div>
  );
}
