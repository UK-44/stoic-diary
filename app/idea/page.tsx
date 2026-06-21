import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { IdeaManager, type IdeaRow } from "@/components/idea/IdeaManager";

export const dynamic = "force-dynamic";

export default async function IdeaPage() {
  const user = await requireUser();
  const ideas = await prisma.idea.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: IdeaRow[] = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    content: i.content ?? "",
    rating: i.rating,
    label: i.label,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight">Idea</h1>
      <IdeaManager ideas={rows} />
    </div>
  );
}
