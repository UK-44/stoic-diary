import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7 はクエリコンパイラ方式のため、接続はドライバアダプタ経由で行う。
// 実行時はプール用の DATABASE_URL（Supabase の transaction pooler）を使う。
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("環境変数 DATABASE_URL が設定されていません");
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// 開発時の HMR でコネクションが枯渇しないようグローバルに保持する。
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
