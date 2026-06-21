import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dateToKey } from "@/lib/date";
import { AccountSettings } from "@/components/settings/AccountSettings";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Settings
        </Link>
        <h1 className="text-xl font-bold tracking-tight">アカウント情報</h1>
      </div>
      <AccountSettings
        email={user.email}
        initialGoal={user.longTermGoal ?? ""}
        initialGoalDate={user.longTermGoalDate ? dateToKey(user.longTermGoalDate) : ""}
      />
    </div>
  );
}
