import { prisma } from "@/lib/db";
import { dateKeyToUtcDate } from "@/lib/date";
import type {
  BulletListConfig,
  ComponentValue,
  FixedMessageOverrides,
  GroupedListConfig,
  ResolvedComponent,
  ResolvedForm,
} from "./types";

/**
 * 対象日付に有効な FormVersion（effectiveFrom <= date の最新）を解決する。
 * 既存エントリがあれば各コンポーネントの入力値もマージする。
 *
 * @param dateKey YYYY-MM-DD
 * @param userId  入力値を引き当てる所有者
 * @param preferFormVersionId 過去エントリ閲覧時に、保存時の版を優先したい場合に指定
 */
export async function resolveFormForDate(
  dateKey: string,
  userId: string,
  preferFormVersionId?: string | null,
): Promise<ResolvedForm | null> {
  const date = dateKeyToUtcDate(dateKey);

  const formVersion = preferFormVersionId
    ? await prisma.formVersion.findUnique({
        where: { id: preferFormVersionId },
        include: formVersionInclude,
      })
    : await prisma.formVersion.findFirst({
        where: { effectiveFrom: { lte: date } },
        orderBy: { effectiveFrom: "desc" },
        include: formVersionInclude,
      });

  if (!formVersion) return null;

  // 既存エントリの値を componentId 単位で引けるようにする。
  const entry = await prisma.diaryEntry.findUnique({
    where: { userId_date: { userId, date } },
    include: { values: true },
  });
  const valueByComponent = new Map<string, ComponentValue>(
    entry?.values.map((v) => [v.componentId, v.value as ComponentValue]) ?? [],
  );

  const components: ResolvedComponent[] = formVersion.items
    // アーカイブ済みコンポーネントは描画しない。
    .filter((item) => item.component.archivedAt === null)
    .map((item) => {
      const { component } = item;
      const overrides = (item.overrides ?? {}) as Partial<FixedMessageOverrides>;
      return {
        componentId: component.id,
        key: component.key,
        name: component.name,
        type: component.type,
        config: component.config as BulletListConfig | GroupedListConfig,
        message:
          component.type === "FIXED_MESSAGE" ? overrides.message ?? "" : null,
        value: valueByComponent.get(component.id) ?? null,
      };
    });

  return {
    formVersionId: formVersion.id,
    formVersionName: formVersion.name,
    components,
  };
}

const formVersionInclude = {
  items: {
    orderBy: { order: "asc" as const },
    include: { component: true },
  },
} as const;
