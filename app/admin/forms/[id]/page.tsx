import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateToKey } from "@/lib/date";
import {
  FormVersionEditor,
  type EditorComponent,
} from "@/components/admin/FormVersionEditor";
import type { FixedMessageOverrides } from "@/lib/diary/types";

export const dynamic = "force-dynamic";

export default async function FormVersionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const version = await prisma.formVersion.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!version) notFound();

  // 選択肢は未アーカイブのコンポーネント全件。
  const components = await prisma.diaryComponent.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const editorComponents: EditorComponent[] = components.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    type: c.type,
  }));

  const initialItems = Object.fromEntries(
    version.items.map((item) => {
      const overrides = (item.overrides ?? {}) as Partial<FixedMessageOverrides>;
      return [item.componentId, { order: item.order, message: overrides.message ?? "" }];
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/forms" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 構成一覧
        </Link>
        <h1 className="text-xl font-semibold">{version.name}</h1>
        <p className="text-sm text-zinc-500">
          {dateToKey(version.effectiveFrom)} から有効
        </p>
      </div>
      <FormVersionEditor
        formVersionId={version.id}
        components={editorComponents}
        initialItems={initialItems}
      />
    </div>
  );
}
