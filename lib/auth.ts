import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ensureUserDefaults } from "@/lib/diary/defaults";

/**
 * 現在ログイン中のオーナーユーザーを返す（未ログインなら null）。
 * Supabase の認証ユーザー（UUID / email）を正とし、対応する User を作成/取得する。
 * 新規ユーザーには既定の日記構成をブートストラップする。
 * 同一リクエスト内（layout + page など）の重複呼び出しは cache で 1 回にまとめる。
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  const dbUser =
    existing ??
    (await prisma.user.create({
      data: {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string | undefined) ?? null,
      },
    }));

  if (existing && user.email && existing.email !== user.email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: user.email },
    });
  }

  // 既定構成が無ければブートストラップ（冪等・自己修復）。
  await ensureUserDefaults(dbUser.id);
  return dbUser;
});

/** 認証必須のヘルパ。未ログインなら /login へリダイレクト（多層防御）。 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
