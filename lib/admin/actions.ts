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
  key: string;
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
  await requireUser();
  const key = input.key.trim();
  const name = input.name.trim();
  if (!/^[a-z0-9_]+$/.test(key)) {
    return { ok: false, error: "key は英小文字・数字・_ のみで指定してください" };
  }
  if (name === "") return { ok: false, error: "名前を入力してください" };

  try {
    await prisma.diaryComponent.create({
      data: { key, name, type: input.type, config: buildConfig(input) },
    });
  } catch {
    return { ok: false, error: "作成に失敗しました（key が重複している可能性）" };
  }
  revalidatePath("/admin/components");
  return { ok: true };
}

export async function updateComponent(
  id: string,
  input: Omit<ComponentInput, "key" | "type">,
): Promise<ActionResult> {
  await requireUser();
  const existing = await prisma.diaryComponent.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "対象が見つかりません" };

  await prisma.diaryComponent.update({
    where: { id },
    data: {
      name: input.name.trim(),
      config: buildConfig({ ...input, key: existing.key, type: existing.type }),
    },
  });
  revalidatePath("/admin/components");
  return { ok: true };
}

export async function setComponentArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  await requireUser();
  await prisma.diaryComponent.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidatePath("/admin/components");
  return { ok: true };
}

// ---------- フォーム構成マスタ ----------

export async function createFormVersion(input: {
  name: string;
  effectiveFrom: string;
}): Promise<ActionResult> {
  await requireUser();
  if (input.name.trim() === "") return { ok: false, error: "名前を入力してください" };
  if (!isDateKey(input.effectiveFrom)) {
    return { ok: false, error: "有効開始日の形式が不正です" };
  }
  const created = await prisma.formVersion.create({
    data: {
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
  order: number;
  message?: string; // FIXED_MESSAGE のみ
};

/** 版の項目構成をまとめて置き換える（全削除→再作成）。 */
export async function saveFormVersionItems(
  formVersionId: string,
  items: FormItemInput[],
): Promise<ActionResult> {
  await requireUser();

  const components = await prisma.diaryComponent.findMany({
    where: { id: { in: items.map((i) => i.componentId) } },
    select: { id: true, type: true },
  });
  const typeById = new Map(components.map((c) => [c.id, c.type]));

  try {
    await prisma.$transaction([
      prisma.formVersionItem.deleteMany({ where: { formVersionId } }),
      prisma.formVersionItem.createMany({
        data: items.map((i) => ({
          formVersionId,
          componentId: i.componentId,
          order: i.order,
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
