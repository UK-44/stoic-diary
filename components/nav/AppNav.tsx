"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: <IconHome /> },
  { href: "/review", label: "Review", icon: <IconReview /> },
  { href: "/idea", label: "Idea", icon: <IconIdea /> },
  { href: "/search", label: "Search", icon: <IconSearch /> },
  { href: "/settings", label: "Settings", icon: <IconSettings /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* PC: 左サイドメニュー */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-zinc-800 md:p-4">
        <div className="mb-6 px-3 text-xl font-bold tracking-tight">stoic diary</div>
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              {it.icon}
              {it.label}
            </Link>
          );
        })}
      </aside>

      {/* スマホ: 下部タブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:hidden">
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
                active ? "text-zinc-100" : "text-zinc-500"
              }`}
            >
              {it.icon}
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconReview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function IconIdea() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.09c.61.27 1.32.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.5-.6 1.21-.33 1.82.27.61.96 1 1.62 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.35.39-1.51 1Z" />
    </svg>
  );
}
