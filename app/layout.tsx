import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/nav/AppNav";

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

// スマホで表示倍率を 100% 固定にし、入力フォーム（input/textarea/contenteditable）に
// フォーカスしても iOS が自動ズームしないようにする。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        {user ? (
          <div className="flex min-h-screen">
            <AppNav />
            {/* スマホは下部タブ分の余白を確保 */}
            <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pb-24 md:px-8 md:pb-8">
              {children}
            </main>
          </div>
        ) : (
          <main className="mx-auto w-full max-w-3xl px-5 py-8">{children}</main>
        )}
      </body>
    </html>
  );
}
