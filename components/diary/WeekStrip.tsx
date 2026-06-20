import Link from "next/link";
import { dayOfMonth, shiftDateKey, weekdayJa, weekKeys } from "@/lib/date";

type Props = {
  selectedKey: string;
  todayKey: string;
  /** その週で記入済みの日付 key の集合 */
  entryDates: Set<string>;
};

export function WeekStrip({ selectedKey, todayKey, entryDates }: Props) {
  const days = weekKeys(selectedKey);
  const prevWeek = shiftDateKey(days[0], -7);
  const nextWeek = shiftDateKey(days[0], 7);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/?d=${prevWeek}`}
        aria-label="前の週"
        className="px-1 text-zinc-500 hover:text-zinc-100"
      >
        ‹
      </Link>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((key) => {
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          const hasEntry = entryDates.has(key);
          return (
            <Link
              key={key}
              href={`/?d=${key}`}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-center transition-colors ${
                selected ? "bg-zinc-800" : "hover:bg-zinc-900"
              }`}
            >
              <span className="text-[10px] text-zinc-500">{weekdayJa(key)}</span>
              <span
                className={`text-sm ${
                  isToday ? "font-bold text-zinc-100" : "text-zinc-300"
                }`}
              >
                {dayOfMonth(key)}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasEntry ? "bg-emerald-400" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
      <Link
        href={`/?d=${nextWeek}`}
        aria-label="次の週"
        className="px-1 text-zinc-500 hover:text-zinc-100"
      >
        ›
      </Link>
    </div>
  );
}
