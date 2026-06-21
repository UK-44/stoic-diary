import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { IdeaForm } from "@/components/idea/IdeaForm";

export const dynamic = "force-dynamic";

export default async function NewIdeaPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/idea" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Idea
        </Link>
        <h1 className="text-xl font-bold tracking-tight">アイデアを追加</h1>
      </div>
      <IdeaForm />
    </div>
  );
}
