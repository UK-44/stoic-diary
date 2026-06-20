import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateToKey } from "@/lib/date";
import { valueToPlainText, type ComponentValue } from "@/lib/diary/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const user = await requireUser();
  const { q = "", c = "" } = await searchParams;
  const keyword = q.trim().toLowerCase();
  const componentId = c.trim();

  const components = await prisma.diaryComponent.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  const hasQuery = keyword !== "" || componentId !== "";

  const results = hasQuery
    ? (
        await prisma.diaryEntry.findMany({
          where: {
            userId: user.id,
            ...(componentId
              ? { values: { some: { componentId } } }
              : {}),
          },
          orderBy: { date: "desc" },
          include: { values: true },
          take: 200,
        })
      ).filter((e) => {
        if (keyword === "") return true;
        const hay = [
          e.goal ?? "",
          ...e.values.map((v) => valueToPlainText(v.value as ComponentValue)),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(keyword);
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight">Search</h1>

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="キーワード"
          className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <select
          name="c"
          defaultValue={c}
          className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          <option value="">すべての項目</option>
          {components.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          検索
        </button>
      </form>

      {!hasQuery ? (
        <p className="text-sm text-zinc-500">キーワードや項目で過去の日記を検索できます。</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-500">該当する日記はありません。</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {results.map((e) => {
            const key = dateToKey(e.date);
            return (
              <li key={key}>
                <Link href={`/?d=${key}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-900">
                  <span className="font-mono text-sm">{key}</span>
                  {e.goal && <span className="truncate text-sm text-zinc-400">{e.goal}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
