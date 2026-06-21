import { prisma } from "@/lib/db";
import { dateKeyToUtcDate } from "@/lib/date";
import type {
  RichTextConfig,
  ComponentValue,
  FixedMessageConfig,
  LabeledTextConfig,
  ResolvedComponent,
  ResolvedForm,
} from "./types";

/**
 * 対象日付の日記フォームを解決する。
 * フォーム＝ユーザーの「項目一覧」（未アーカイブのコンポーネントを order 順）。
 * 既存エントリがあれば各コンポーネントの入力値をマージする。
 */
export async function resolveFormForDate(
  dateKey: string,
  userId: string,
): Promise<ResolvedForm> {
  const date = dateKeyToUtcDate(dateKey);

  const [components, entry] = await Promise.all([
    prisma.diaryComponent.findMany({
      where: { userId, archivedAt: null },
      orderBy: { order: "asc" },
    }),
    prisma.diaryEntry.findUnique({
      where: { userId_date: { userId, date } },
      include: { values: true },
    }),
  ]);

  const valueByComponent = new Map<string, ComponentValue>(
    entry?.values.map((v) => [v.componentId, v.value as ComponentValue]) ?? [],
  );

  const resolved: ResolvedComponent[] = components.map((c) => {
    const config = (c.config ?? {}) as
      | RichTextConfig
      | LabeledTextConfig
      | FixedMessageConfig;
    return {
      componentId: c.id,
      key: c.key,
      name: c.name,
      type: c.type,
      config,
      message:
        c.type === "FIXED_MESSAGE"
          ? (config as FixedMessageConfig).message ?? ""
          : null,
      value: valueByComponent.get(c.id) ?? null,
    };
  });

  return { components: resolved };
}
