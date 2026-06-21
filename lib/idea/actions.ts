"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { IdeaLabel } from "@/lib/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type IdeaInput = {
  title: string;
  content: string;
  rating: number; // 0..5
  label: IdeaLabel | null;
};

function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createIdea(input: IdeaInput): Promise<CreateResult> {
  const user = await requireUser();
  const title = input.title.trim();
  if (title === "") return { ok: false, error: "見出しを入力してください" };

  const created = await prisma.idea.create({
    data: {
      userId: user.id,
      title,
      content: input.content.trim() === "" ? null : input.content,
      rating: clampRating(input.rating),
      label: input.label,
    },
  });
  revalidatePath("/idea");
  return { ok: true, id: created.id };
}

export async function updateIdea(id: string, input: IdeaInput): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.idea.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "対象が見つかりません" };
  if (input.title.trim() === "") return { ok: false, error: "見出しを入力してください" };

  await prisma.idea.update({
    where: { id },
    data: {
      title: input.title.trim(),
      content: input.content.trim() === "" ? null : input.content,
      rating: clampRating(input.rating),
      label: input.label,
    },
  });
  revalidatePath("/idea");
  return { ok: true };
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.idea.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "対象が見つかりません" };
  await prisma.idea.delete({ where: { id } });
  revalidatePath("/idea");
  return { ok: true };
}
