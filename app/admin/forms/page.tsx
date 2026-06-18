import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  FormVersionList,
  type FormVersionRow,
} from "@/components/admin/FormVersionList";
import { dateToKey } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function FormsAdminPage() {
  await requireUser();
  const versions = await prisma.formVersion.findMany({
    orderBy: { effectiveFrom: "desc" },
    include: { _count: { select: { items: true } } },
  });

  const rows: FormVersionRow[] = versions.map((v) => ({
    id: v.id,
    name: v.name,
    effectiveFrom: dateToKey(v.effectiveFrom),
    itemCount: v._count.items,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">フォーム構成管理</h1>
      <FormVersionList versions={rows} />
    </div>
  );
}
