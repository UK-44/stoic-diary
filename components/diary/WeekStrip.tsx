"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dayOfMonth, shiftDateKey, weekdayJa, weekKeys } from "@/lib/date";

type Props = {
  selectedKey: string;
  todayKey: string;
  /** 記入済みの日付 key（全期間） */
  entryDates: string[];
};

/**
 * 週の日付ストリップ。左右スワイプ / 横スクロール / ‹ › で週単位に切替できる
 * （週送りはクライアント側で即時、日付タップでその日を読み込む）。
 */
export function WeekStrip({ selectedKey, todayKey, entryDates }: Props) {
  // 表示中の週（選択日とは独立に動かせる）と、切替方向（本文と連動したスライド用）。
  const [viewDate, setViewDate] = useState(selectedKey);
  const [dir, setDir] = useState(0); // 1=翌週(右から) / -1=前週(左から)
  useEffect(() => {
    setViewDate(selectedKey);
    setDir(0);
  }, [selectedKey]);

  const entrySet = useMemo(() => new Set(entryDates), [entryDates]);
  const days = weekKeys(viewDate);

  const touchX = useRef<number | null>(null);
  const wheelLock = useRef(false);

  const changeWeek = (d: number) => {
    setDir(d);
    setViewDate((v) => shiftDateKey(v, d * 7));
  };

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) changeWeek(dx < 0 ? 1 : -1); // 左スワイプ→翌週
    touchX.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 24) {
      if (wheelLock.current) return;
      wheelLock.current = true;
      changeWeek(e.deltaX > 0 ? 1 : -1);
      setTimeout(() => (wheelLock.current = false), 280);
    }
  }

  return (
    <div
      className="flex select-none items-center gap-1"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <button
        onClick={() => changeWeek(-1)}
        aria-label="前の週"
        className="px-1 text-zinc-500 hover:text-zinc-100"
      >
        ‹
      </button>
      <div
        key={viewDate}
        className={`grid flex-1 grid-cols-7 gap-1 ${
          dir > 0 ? "slide-in-right" : dir < 0 ? "slide-in-left" : ""
        }`}
      >
        {days.map((key) => {
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          const hasEntry = entrySet.has(key);
          return (
            <Link
              key={key}
              href={`/?d=${key}`}
              scroll={false}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-center transition-colors ${
                selected ? "bg-zinc-800" : "hover:bg-zinc-900"
              }`}
            >
              <span className="text-[10px] text-zinc-500">{weekdayJa(key)}</span>
              <span className={`text-sm ${isToday ? "font-bold text-zinc-100" : "text-zinc-300"}`}>
                {dayOfMonth(key)}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${hasEntry ? "bg-emerald-400" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
      <button
        onClick={() => changeWeek(1)}
        aria-label="次の週"
        className="px-1 text-zinc-500 hover:text-zinc-100"
      >
        ›
      </button>
    </div>
  );
}
