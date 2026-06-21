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
import { DiaryPane } from "@/components/diary/DiaryPane";

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

  // 記入済み日（ストリップ用・全期間の日付のみ）、選択日のエントリ、フォームを並列取得。
  const [allEntries, selectedEntry, form] = await Promise.all([
    prisma.diaryEntry.findMany({ where: { userId: user.id }, select: { date: true } }),
    prisma.diaryEntry.findUnique({
      where: { userId_date: { userId: user.id, date: dateKeyToUtcDate(selected) } },
      select: { rating: true },
    }),
    resolveFormForDate(selected, user.id),
  ]);
  const entryDates = allEntries.map((e) => dateToKey(e.date));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-center text-xl font-bold tracking-tight">{prettyDate(selected)}</h1>
        <WeekStrip selectedKey={selected} todayKey={today} entryDates={entryDates} />
      </header>

      {user.longTermGoal && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              長期目標
            </span>
            {user.longTermGoalDate && (
              <span className="text-[11px] text-zinc-400">
                〜 {dateToKey(user.longTermGoalDate)}
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm font-medium text-zinc-50">
            {user.longTermGoal}
          </p>
        </div>
      )}

      <DiaryPane dateKey={selected}>
        <DiaryEditor
          dateKey={selected}
          form={form}
          initialRating={selectedEntry?.rating ?? null}
          existing={selectedEntry !== null}
        />
      </DiaryPane>
    </div>
  );
}

function prettyDate(key: string): string {
  const d = dateKeyToUtcDate(key);
  return `${d.getUTCMonth() + 1}月${dayOfMonth(key)}日 (${weekdayJa(key)})`;
}
