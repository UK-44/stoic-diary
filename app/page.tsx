import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateToKey, todayKey } from "@/lib/date";

// DB の最新状態を常に反映する。
export const dynamic = "force-dynamic";

const RATING_LABELS = ["", "悪い", "悪くない", "良い", "素晴らしい"];

export default async function Home() {
  const user = await requireUser();
  const today = todayKey();

  const entries = await prisma.diaryEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 50,
    select: { date: true, goal: true, rating: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">日記</h1>
        <p className="text-sm text-zinc-400">
          Notion から移行した自分専用の日記。
        </p>
      </section>

      <Link
        href={`/diary/${today}`}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 transition-colors hover:border-zinc-600"
      >
        <div className="text-sm text-zinc-400">今日の日記を書く</div>
        <div className="text-lg font-medium">{today}</div>
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-300">これまでの記録</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ記録がありません。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {entries.map((e) => {
              const key = dateToKey(e.date);
              return (
                <li key={key}>
                  <Link
                    href={`/diary/${key}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-900"
                  >
                    <span className="font-mono text-sm">{key}</span>
                    <span className="flex-1 truncate text-sm text-zinc-400">
                      {e.goal ?? ""}
                    </span>
                    {e.rating != null && (
                      <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {e.rating}・{RATING_LABELS[e.rating]}
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
