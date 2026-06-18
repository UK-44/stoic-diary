import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import { resolveFormForDate } from "@/lib/diary/form-resolver";
import { DiaryForm } from "@/components/diary/DiaryForm";

export const dynamic = "force-dynamic";

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isDateKey(date)) notFound();

  const user = await requireUser();

  // 既存エントリ（保存時の版を優先して当時の構成で表示する）。
  const entry = await prisma.diaryEntry.findUnique({
    where: { userId_date: { userId: user.id, date: dateKeyToUtcDate(date) } },
  });

  const form = await resolveFormForDate(date, user.id, entry?.formVersionId);

  if (!form) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">{date}</h1>
        <p className="text-sm text-zinc-400">
          この日付に適用できるフォーム構成がありません。
          <Link href="/admin/forms" className="ml-1 underline">
            構成を作成
          </Link>
          してください。
        </p>
      </div>
    );
  }

  return (
    <DiaryForm
      dateKey={date}
      form={form}
      initialGoal={entry?.goal ?? ""}
      initialRating={entry?.rating ?? null}
    />
  );
}
