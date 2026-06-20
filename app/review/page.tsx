import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, dateToKey, shiftDateKey, todayKey } from "@/lib/date";

export const dynamic = "force-dynamic";

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "素晴らしい"];

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser();
  const { period: p } = await searchParams;
  const period = p === "month" ? "month" : "week";
  const today = todayKey();
  const days = period === "month" ? 30 : 7;
  const from = shiftDateKey(today, -(days - 1));

  const entries = await prisma.diaryEntry.findMany({
    where: {
      userId: user.id,
      date: { gte: dateKeyToUtcDate(from), lte: dateKeyToUtcDate(today) },
    },
    orderBy: { date: "desc" },
    include: { _count: { select: { values: true } } },
  });

  const rated = entries.filter((e) => e.rating != null);
  const avg =
    rated.length > 0
      ? (rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Review</h1>
        <div className="flex gap-1 text-sm">
          <Tab href="/review?period=week" label="1週間" active={period === "week"} />
          <Tab href="/review?period=month" label="1ヶ月" active={period === "month"} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="記入した日数" value={`${entries.length} / ${days}`} />
        <Stat label="平均の総合評価" value={avg} />
      </div>

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
                    <span className="flex-1 truncate text-sm text-zinc-400">{e.goal ?? ""}</span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
