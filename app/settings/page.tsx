import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AccountSettings } from "@/components/settings/AccountSettings";
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

export default async function SettingsPage() {
  const user = await requireUser();
  const components = await prisma.diaryComponent.findMany({
    where: { userId: user.id },
    orderBy: [{ archivedAt: "asc" }, { order: "asc" }],
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
      archived: c.archivedAt !== null,
    };
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <Section title="アカウント">
        <AccountSettings email={user.email} initialGoal={user.longTermGoal ?? ""} />
      </Section>

      <Section
        title="日記の項目"
        description="テンプレ（種類）から項目を追加し、名前・並び順・取捨を決めます。ここで使う項目がそのまま日記になります。"
      >
        <ComponentManager components={rows} />
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
