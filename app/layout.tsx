import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stoic Diary",
  description: "Notion から移行した自分専用の日記アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Stoic Diary
            </Link>
            {user && (
              <nav className="flex items-center gap-4 text-sm text-zinc-400">
                <Link href="/" className="hover:text-zinc-100">
                  一覧
                </Link>
                <Link href="/admin/forms" className="hover:text-zinc-100">
                  構成
                </Link>
                <Link href="/admin/components" className="hover:text-zinc-100">
                  部品
                </Link>
                <form action={logout}>
                  <button type="submit" className="hover:text-zinc-100">
                    ログアウト
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
