import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * 現在ログイン中のオーナーユーザーを返す（未ログインなら null）。
 * Supabase の認証ユーザー（UUID / email）を正とし、対応する User を upsert する。
 * 同一リクエスト内（layout + page など）の重複呼び出しは cache で 1 回にまとめる。
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email ?? "" },
    create: {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? null,
    },
  });
});

/** 認証必須のヘルパ。未ログインなら /login へリダイレクト（多層防御）。 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
