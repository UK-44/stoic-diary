import { redirect } from "next/navigation";
import { isDateKey } from "@/lib/date";

// 旧 URL は Home（週ストリップ付き）に統合。/?d=YYYY-MM-DD へ転送する。
export default async function DiaryDateRedirect({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  redirect(isDateKey(date) ? `/?d=${date}` : "/");
}
