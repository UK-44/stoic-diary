import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  addMonths,
  dateKeyToUtcDate,
  dateToKey,
  dayOfMonth,
  isDateKey,
  monthKeys,
  monthLabel,
  monthStartKey,
  shiftDateKey,
  todayKey,
  weekKeys,
} from "@/lib/date";
import { RatingTrend } from "@/components/review/RatingTrend";
import { PeriodReflection } from "@/components/review/PeriodReflection";
import { AiReflectionButton } from "@/components/ai/AiReflectionButton";
import { buildPeriodPrompt } from "@/lib/ai/reflection";
import {
  previewFromValues,
  HABIT_TARGET_DAYS,
  type HabitConfig,
  type HabitValue,
} from "@/lib/diary/types";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "最高"];

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string }>;
}) {
  const user = await requireUser();
  const { period: p, start: s } = await searchParams;
  const periodType: PeriodType = p === "month" ? "MONTH" : "WEEK";
  const today = todayKey();

  // 期間の開始日（週=日曜 / 月=1日）。
  const defaultStart =
    periodType === "WEEK" ? weekKeys(today)[0] : monthStartKey(today);
  const start = s && isDateKey(s) ? s : defaultStart;

  const days = periodType === "WEEK" ? weekKeys(start) : monthKeys(start);
  const from = days[0];
  const to = days[days.length - 1];

  const entries = await prisma.diaryEntry.findMany({
    where: {
      userId: user.id,
      date: { gte: dateKeyToUtcDate(from), lte: dateKeyToUtcDate(to) },
    },
    orderBy: { date: "desc" },
    select: { date: true, rating: true, values: { select: { value: true } } },
  });

  const ratingByDay = new Map(
    entries.map((e) => [dateToKey(e.date), e.rating ?? null]),
  );
  const cells = days.map((key) => ({ key, rating: ratingByDay.get(key) ?? null }));

  const rated = entries.filter((e) => e.rating != null);
  const avg =
    rated.length > 0
      ? (rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";

  const review = await prisma.periodReview.findUnique({
    where: {
      userId_periodType_periodStart: {
        userId: user.id,
        periodType,
        periodStart: dateKeyToUtcDate(start),
      },
    },
  });

  // 習慣状況: 各習慣の通算達成日数と、この期間での達成日数を集計する。
  const habitComponents = await prisma.diaryComponent.findMany({
    where: { userId: user.id, type: "HABIT" },
    orderBy: { order: "asc" },
  });
  const habitValues =
    habitComponents.length > 0
      ? await prisma.diaryEntryValue.findMany({
          where: {
            componentId: { in: habitComponents.map((c) => c.id) },
            entry: { userId: user.id },
          },
          select: { componentId: true, value: true, entry: { select: { date: true } } },
        })
      : [];
  const habitStatuses = habitComponents.flatMap((c) => {
    const habits = (c.config as HabitConfig).habits ?? [];
    return habits.map((h) => {
      const targetDays = HABIT_TARGET_DAYS[h.difficulty];
      let total = 0;
      const checkedKeys = new Set<string>();
      for (const v of habitValues) {
        if (v.componentId !== c.id) continue;
        if ((v.value as HabitValue | null)?.[h.id] !== true) continue;
        total += 1;
        const key = dateToKey(v.entry.date);
        if (key >= from && key <= to) checkedKeys.add(key);
      }
      // 期間内の各日の達成状況（done=達成 / miss=未達成 / future=未来日）。
      const daily = days.map((key) => ({
        key,
        day: dayOfMonth(key),
        state: checkedKeys.has(key)
          ? ("done" as const)
          : key > today
            ? ("future" as const)
            : ("miss" as const),
      }));
      const remaining = Math.max(0, targetDays - total);
      return {
        id: h.id,
        name: h.name,
        difficulty: h.difficulty,
        targetDays,
        total,
        periodCount: checkedKeys.size,
        remaining,
        achieved: remaining === 0,
        daily,
      };
    });
  });

  const prevStart =
    periodType === "WEEK" ? shiftDateKey(start, -7) : addMonths(start, -1);
  const nextStart =
    periodType === "WEEK" ? shiftDateKey(start, 7) : addMonths(start, 1);
  const periodLabel =
    periodType === "WEEK" ? `${from} 〜 ${to}` : monthLabel(start);

  const base = (start: string) =>
    `/review?period=${periodType === "WEEK" ? "week" : "month"}&start=${start}`;

  // AI振り返り用プロンプト（長期目標＋この期間の各項目の入力情報）。
  const aiPrompt = buildPeriodPrompt({
    periodType,
    periodLabel,
    longTermGoal: user.longTermGoal ?? null,
    longTermGoalDate: user.longTermGoalDate ? dateToKey(user.longTermGoalDate) : null,
    review: {
      goal: review?.goal ?? "",
      wentWell: review?.wentWell ?? "",
      couldImprove: review?.couldImprove ?? "",
      nextActions: review?.nextActions ?? "",
    },
    filledDays: entries.length,
    totalDays: days.length,
    avgRating: avg,
    habits: habitStatuses.map((h) => ({
      name: h.name,
      achieved: h.achieved,
      remaining: h.remaining,
      targetDays: h.targetDays,
      periodCount: h.periodCount,
    })),
    entries: entries.map((e) => ({
      date: dateToKey(e.date),
      ratingLabel: e.rating != null ? RATING_LABELS[e.rating] : null,
      preview: previewFromValues(e.values),
    })),
  });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Review</h1>
        <div className="flex gap-1 text-sm">
          <Tab href="/review?period=week" label="1週間" active={periodType === "WEEK"} />
          <Tab href="/review?period=month" label="1ヶ月" active={periodType === "MONTH"} />
        </div>
      </div>

      {/* 期間ナビ */}
      <div className="flex items-center justify-between text-sm">
        <Link href={base(prevStart)} className="text-zinc-400 hover:text-zinc-100">
          ← 前へ
        </Link>
        <span className="font-medium">{periodLabel}</span>
        <Link href={base(nextStart)} className="text-zinc-400 hover:text-zinc-100">
          次へ →
        </Link>
      </div>

      {/* サマリー（評価推移＋指標） */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <RatingTrend cells={cells} />
        <div className="flex gap-6 text-sm">
          <span className="text-zinc-400">
            記入 <span className="font-semibold text-zinc-100">{entries.length}</span> / {days.length} 日
          </span>
          <span className="text-zinc-400">
            平均評価 <span className="font-semibold text-zinc-100">{avg}</span>
          </span>
        </div>
      </section>

      {/* 目標と振り返り */}
      <section className="flex flex-col gap-3">
        <PeriodReflection
          key={`${periodType}:${start}`}
          periodType={periodType}
          periodStart={start}
          initial={{
            goal: review?.goal ?? "",
            wentWell: review?.wentWell ?? "",
            couldImprove: review?.couldImprove ?? "",
            nextActions: review?.nextActions ?? "",
          }}
        />
      </section>

      {/* 習慣状況 */}
      {habitStatuses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            習慣状況
          </h2>
          <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {habitStatuses.map((h) => (
              <li key={h.id} className="flex flex-col gap-3 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm">{h.name}</span>
                  <span className="shrink-0 text-right text-xs">
                    {h.achieved ? (
                      <span className="font-semibold text-emerald-400">目標達成 🎉</span>
                    ) : (
                      <span className="text-zinc-400">
                        残り{" "}
                        <span className="font-semibold text-zinc-100">{h.remaining}</span>
                        {" / "}
                        {h.targetDays} 日
                      </span>
                    )}
                  </span>
                </div>
                {/* 期間内の日別達成状況 */}
                <div className="flex flex-wrap gap-x-1 gap-y-1.5">
                  {h.daily.map((d) => (
                    <div key={d.key} className="flex w-5 flex-col items-center gap-1">
                      <span
                        title={d.state === "done" ? "達成" : d.state === "miss" ? "未達成" : "未来"}
                        className={`h-1.5 w-1.5 rounded-full ${
                          d.state === "done"
                            ? "bg-emerald-400"
                            : d.state === "miss"
                              ? "bg-red-400"
                              : "bg-zinc-700"
                        }`}
                      />
                      <span className="text-[10px] tabular-nums text-zinc-500">{d.day}</span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 期間内の日記一覧 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          この期間の日記
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">この期間の記入はありません。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {entries.map((e) => {
              const key = dateToKey(e.date);
              return (
                <li key={key}>
                  <Link
                    href={`/?d=${key}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-900"
                  >
                    <span className="font-mono text-sm">{key}</span>
                    <span className="flex-1 truncate text-sm text-zinc-400">
                      {previewFromValues(e.values)}
                    </span>
                    {e.rating != null && (
                      <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {RATING_LABELS[e.rating]}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 最下部: この期間の入力内容と長期目標を ChatGPT に渡して振り返る */}
      <AiReflectionButton prompt={aiPrompt} />
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 ${
        active ? "bg-zinc-200 text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}
