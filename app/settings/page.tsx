import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-800">
        <MenuLink href="/settings/account" title="アカウント情報" desc="メールアドレス・長期目標" />
        <MenuLink href="/settings/diary" title="日記の構成" desc="日記に表示する項目の追加・並び替え" />
      </div>

      <form action={logout} className="rounded-lg border border-zinc-800">
        <button
          type="submit"
          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-zinc-900"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

function MenuLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 last:border-b-0 hover:bg-zinc-900"
    >
      <div className="flex flex-col">
        <span className="text-sm">{title}</span>
        <span className="text-xs text-zinc-500">{desc}</span>
      </div>
      <span className="text-zinc-600">›</span>
    </Link>
  );
}
