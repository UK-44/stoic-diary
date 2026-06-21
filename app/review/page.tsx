import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  addMonths,
  dateKeyToUtcDate,
  dateToKey,
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
import { previewFromValues } from "@/lib/diary/types";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "素晴らしい"];

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

  const prevStart =
    periodType === "WEEK" ? shiftDateKey(start, -7) : addMonths(start, -1);
  const nextStart =
    periodType === "WEEK" ? shiftDateKey(start, 7) : addMonths(start, 1);
  const periodLabel =
    periodType === "WEEK" ? `${from} 〜 ${to}` : monthLabel(start);

  const base = (start: string) =>
    `/review?period=${periodType === "WEEK" ? "week" : "month"}&start=${start}`;

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

      {/* 期間内の日記一覧 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
