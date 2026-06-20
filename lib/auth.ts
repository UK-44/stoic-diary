import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ensureUserDefaults } from "@/lib/diary/defaults";

/**
 * 現在ログイン中のオーナーユーザーを返す（未ログインなら null）。
 *
 * 認証検証は proxy.ts の getUser()（トークン更新込み）に任せ、ここでは
 * getClaims()（ローカル JWT 検証・ネットワーク往復なし）で sub/email を読む。
 * これにより毎遷移ごとの Supabase 往復を 1 回減らす。
 * 同一リクエスト内（layout + page など）の重複呼び出しは cache で 1 回にまとめる。
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const id = claims.sub;
  const email = (claims.email as string | undefined) ?? "";

  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) {
    if (email && existing.email !== email) {
      await prisma.user.update({ where: { id }, data: { email } });
    }
    return existing;
  }

  // 新規ユーザーのみ作成し、既定の日記構成をブートストラップする。
  const created = await prisma.user.create({
    data: {
      id,
      email,
      name: (claims.user_metadata?.name as string | undefined) ?? null,
    },
  });
  await ensureUserDefaults(created.id);
  return created;
});

/** 認証必須のヘルパ。未ログインなら /login へリダイレクト（多層防御）。 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
