import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ComponentManager,
  type ComponentRow,
} from "@/components/admin/ComponentManager";
import type { BulletListConfig, GroupedListConfig } from "@/lib/diary/types";

export const dynamic = "force-dynamic";

export default async function ComponentsAdminPage() {
  await requireUser();
  const components = await prisma.diaryComponent.findMany({
    orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
  });

  const rows: ComponentRow[] = components.map((c) => {
    const config = (c.config ?? {}) as BulletListConfig & GroupedListConfig;
    return {
      id: c.id,
      key: c.key,
      name: c.name,
      type: c.type,
      placeholder: config.placeholder ?? "",
      groups: config.groups ?? [],
      archived: c.archivedAt !== null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">コンポーネント管理</h1>
      <ComponentManager components={rows} />
    </div>
  );
}
