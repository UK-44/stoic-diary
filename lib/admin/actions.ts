"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ComponentType } from "@/lib/diary/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------- コンポーネントマスタ ----------

export type ComponentInput = {
  name: string;
  type: ComponentType;
  placeholder?: string;
  groups?: string[];
};

function buildConfig(input: ComponentInput): Prisma.InputJsonValue {
  switch (input.type) {
    case "BULLET_LIST":
      return input.placeholder ? { placeholder: input.placeholder } : {};
    case "GROUPED_LIST":
      return { groups: (input.groups ?? []).filter((g) => g.trim() !== "") };
    case "FIXED_MESSAGE":
    default:
      return {};
  }
}

export async function createComponent(input: ComponentInput): Promise<ActionResult> {
  const user = await requireUser();
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "名前を入力してください" };

  // key はユーザーごとに自動採番（手入力しない）。order は末尾に追加。
  const [count, agg] = await Promise.all([
    prisma.diaryComponent.count({ where: { userId: user.id } }),
    prisma.diaryComponent.aggregate({
      where: { userId: user.id },
      _max: { order: true },
    }),
  ]);

  try {
    await prisma.diaryComponent.create({
      data: {
        userId: user.id,
        key: `c${count + 1}`,
        name,
        type: input.type,
        config: buildConfig(input),
        order: (agg._max.order ?? 0) + 10,
      },
    });
  } catch {
    return { ok: false, error: "作成に失敗しました" };
  }
  revalidatePath("/admin/components");
  return { ok: true };
}

export async function updateComponent(
  id: string,
  input: Omit<ComponentInput, "type">,
): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.diaryComponent.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { ok: false, error: "対象が見つかりません" };

  await prisma.diaryComponent.update({
    where: { id },
    data: {
      name: input.name.trim(),
      config: buildConfig({ ...input, type: existing.type }),
    },
  });
  revalidatePath("/admin/components");
  return { ok: true };
}

export async function setComponentArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.diaryComponent.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "対象が見つかりません" };

  await prisma.diaryComponent.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidatePath("/admin/components");
  return { ok: true };
}

/** コンポーネントの並び順を 1 つ上/下に移動する（隣と order を入れ替え）。 */
export async function moveComponent(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const user = await requireUser();
  const list = await prisma.diaryComponent.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, error: "対象が見つかりません" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { ok: true }; // 端なので何もしない

  const a = list[idx];
  const b = list[swapIdx];
  await prisma.$transaction([
    prisma.diaryComponent.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.diaryComponent.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath("/admin/components");
  return { ok: true };
}

// ---------- フォーム構成マスタ ----------

export async function createFormVersion(input: {
  name: string;
  effectiveFrom: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (input.name.trim() === "") return { ok: false, error: "名前を入力してください" };
  if (!isDateKey(input.effectiveFrom)) {
    return { ok: false, error: "有効開始日の形式が不正です" };
  }
  const created = await prisma.formVersion.create({
    data: {
      userId: user.id,
      name: input.name.trim(),
      effectiveFrom: dateKeyToUtcDate(input.effectiveFrom),
    },
  });
  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${created.id}`);
  return { ok: true };
}

export type FormItemInput = {
  componentId: string;
  message?: string; // FIXED_MESSAGE のみ
};

/** 版の項目構成（どのコンポーネントを含めるか）をまとめて置き換える。並び順は各コンポーネントの order に従う。 */
export async function saveFormVersionItems(
  formVersionId: string,
  items: FormItemInput[],
): Promise<ActionResult> {
  const user = await requireUser();

  const version = await prisma.formVersion.findFirst({
    where: { id: formVersionId, userId: user.id },
    select: { id: true },
  });
  if (!version) return { ok: false, error: "対象が見つかりません" };

  // 自分のコンポーネントのみ受け付ける（所有チェック）。
  const components = await prisma.diaryComponent.findMany({
    where: { id: { in: items.map((i) => i.componentId) }, userId: user.id },
    select: { id: true, type: true },
  });
  const typeById = new Map(components.map((c) => [c.id, c.type]));
  const valid = items.filter((i) => typeById.has(i.componentId));

  try {
    await prisma.$transaction([
      prisma.formVersionItem.deleteMany({ where: { formVersionId } }),
      prisma.formVersionItem.createMany({
        data: valid.map((i) => ({
          formVersionId,
          componentId: i.componentId,
          overrides:
            typeById.get(i.componentId) === "FIXED_MESSAGE"
              ? ({ message: i.message ?? "" } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        })),
      }),
    ]);
  } catch (e) {
    console.error("saveFormVersionItems failed", e);
    return { ok: false, error: "保存に失敗しました" };
  }
  revalidatePath(`/admin/forms/${formVersionId}`);
  revalidatePath("/admin/forms");
  return { ok: true };
}
