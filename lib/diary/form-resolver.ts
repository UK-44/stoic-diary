import { prisma } from "@/lib/db";
import { dateKeyToUtcDate } from "@/lib/date";
import {
  HABIT_TARGET_DAYS,
  type RichTextConfig,
  type ComponentValue,
  type FixedMessageConfig,
  type LabeledTextConfig,
  type CheckboxListConfig,
  type HabitConfig,
  type HabitProgress,
  type HabitValue,
  type ResolvedComponent,
  type ResolvedForm,
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
      where: { userId },
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

  // 習慣（HABIT）の「選択日より前にチェックした日数」を習慣ごとに集計する。
  // キーは `${componentId}:${habitId}`。
  const habitIds = components.filter((c) => c.type === "HABIT").map((c) => c.id);
  const checkedBefore = new Map<string, number>();
  if (habitIds.length > 0) {
    const prior = await prisma.diaryEntryValue.findMany({
      where: {
        componentId: { in: habitIds },
        entry: { userId, date: { lt: date } },
      },
      select: { componentId: true, value: true },
    });
    for (const v of prior) {
      const checks = v.value as HabitValue | null;
      if (!checks || typeof checks !== "object") continue;
      for (const [habitId, checked] of Object.entries(checks)) {
        if (checked === true) {
          const key = `${v.componentId}:${habitId}`;
          checkedBefore.set(key, (checkedBefore.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const resolved: ResolvedComponent[] = components.map((c) => {
    const config = (c.config ?? {}) as
      | RichTextConfig
      | LabeledTextConfig
      | FixedMessageConfig
      | CheckboxListConfig
      | HabitConfig;
    let habit: HabitProgress[] | null = null;
    if (c.type === "HABIT") {
      const habits = (config as HabitConfig).habits ?? [];
      habit = habits.map((h) => ({
        id: h.id,
        name: h.name,
        difficulty: h.difficulty,
        targetDays: HABIT_TARGET_DAYS[h.difficulty],
        checkedBefore: checkedBefore.get(`${c.id}:${h.id}`) ?? 0,
      }));
    }
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
      habit,
    };
  });

  return { components: resolved };
}
