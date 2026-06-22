import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ComponentManager,
  type ComponentRow,
} from "@/components/settings/ComponentManager";
import type {
  FixedMessageConfig,
  LabeledTextConfig,
  RichTextConfig,
} from "@/lib/diary/types";

export const dynamic = "force-dynamic";

export default async function DiarySettingsPage() {
  const user = await requireUser();
  const components = await prisma.diaryComponent.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  const rows: ComponentRow[] = components.map((c) => {
    const config = (c.config ?? {}) as RichTextConfig &
      LabeledTextConfig &
      FixedMessageConfig;
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      placeholder: config.placeholder ?? "",
      groups: config.groups ?? [],
      message: config.message ?? "",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Settings
        </Link>
        <h1 className="text-xl font-bold tracking-tight">日記の構成</h1>
        <p className="text-xs text-zinc-500">
          テンプレ（種類）から項目を追加し、名前・並び順・取捨を決めます。ここで使う項目がそのまま日記になります。
        </p>
      </div>
      <ComponentManager components={rows} />
    </div>
  );
}
