import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { IdeaForm } from "@/components/idea/IdeaForm";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const idea = await prisma.idea.findFirst({ where: { id, userId: user.id } });
  if (!idea) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/idea" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Idea
      </Link>
      <IdeaForm
        initial={{
          id: idea.id,
          title: idea.title,
          content: idea.content ?? "",
          rating: idea.rating,
          label: idea.label,
        }}
      />
    </div>
  );
}
