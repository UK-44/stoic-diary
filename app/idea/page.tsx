import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StarRating } from "@/components/idea/StarRating";
import { valueToPlainText } from "@/lib/diary/types";
import type { IdeaLabel } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const LABEL_TEXT: Record<IdeaLabel, string> = { FAMILY: "家族", WORK: "仕事", MAN: "Man" };

export default async function IdeaPage() {
  const user = await requireUser();
  const ideas = await prisma.idea.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight">Idea</h1>

      {ideas.length === 0 ? (
        <p className="text-sm text-zinc-500">
          まだアイデアがありません。右下の ＋ から追加できます。
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Link href={`/idea/${idea.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{idea.title}</span>
                  {idea.label && (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      {LABEL_TEXT[idea.label]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StarRating value={idea.rating} readOnly />
                  {idea.content && (
                    <span className="truncate text-xs text-zinc-500">
                      {valueToPlainText(idea.content)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 追加ボタン（X.com 風の浮遊ボタン） */}
      <Link
        href="/idea/new"
        aria-label="アイデアを追加"
        className="fixed bottom-20 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-3xl font-light text-zinc-900 shadow-xl transition-transform hover:scale-105 md:bottom-8 md:right-8"
      >
        +
      </Link>
    </div>
  );
}
