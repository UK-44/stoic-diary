import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AccountSettings } from "@/components/settings/AccountSettings";
import {
  ComponentOrderList,
  type OrderRow,
} from "@/components/settings/ComponentOrderList";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const components = await prisma.diaryComponent.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true, type: true },
  });
  const rows: OrderRow[] = components;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <Section title="アカウント">
        <AccountSettings email={user.email} initialGoal={user.longTermGoal ?? ""} />
      </Section>

      <Section
        title="コンポーネントの並び順"
        description="日記に表示する項目の順番を並び替えます（項目の定義そのものは変更できません）。"
      >
        <ComponentOrderList components={rows} />
      </Section>

      <Section
        title="フォーム構成（時期ごとに使う項目）"
        description="どの項目をいつ使うか・固定メッセージの文面を版で管理します。"
      >
        <Link
          href="/admin/forms"
          className="inline-block rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          フォーム構成を管理 →
        </Link>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}
