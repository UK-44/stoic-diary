import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  dateKeyToUtcDate,
  dateToKey,
  dayOfMonth,
  isDateKey,
  todayKey,
  weekdayJa,
  weekKeys,
} from "@/lib/date";
import { resolveFormForDate } from "@/lib/diary/form-resolver";
import { WeekStrip } from "@/components/diary/WeekStrip";
import { DiaryEditor } from "@/components/diary/DiaryEditor";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const user = await requireUser();
  const { d } = await searchParams;
  const today = todayKey();
  const selected = d && isDateKey(d) ? d : today;

  // 週の記入状況とフォーム解決は独立なので並列取得する。
  const week = weekKeys(selected);
  const [weekEntries, form] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: dateKeyToUtcDate(week[0]),
          lte: dateKeyToUtcDate(week[6]),
        },
      },
      select: { date: true, goal: true, rating: true },
    }),
    resolveFormForDate(selected, user.id),
  ]);
  const entryDates = new Set(weekEntries.map((e) => dateToKey(e.date)));
  const selectedEntry = weekEntries.find((e) => dateToKey(e.date) === selected) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-center text-xl font-bold tracking-tight">{prettyDate(selected)}</h1>
        <WeekStrip selectedKey={selected} todayKey={today} entryDates={entryDates} />
      </header>

      <DiaryEditor
        key={selected}
        dateKey={selected}
        form={form}
        initialGoal={selectedEntry?.goal ?? ""}
        initialRating={selectedEntry?.rating ?? null}
        existing={selectedEntry !== null}
      />
    </div>
  );
}

function prettyDate(key: string): string {
  const d = dateKeyToUtcDate(key);
  return `${d.getUTCMonth() + 1}月${dayOfMonth(key)}日 (${weekdayJa(key)})`;
}
