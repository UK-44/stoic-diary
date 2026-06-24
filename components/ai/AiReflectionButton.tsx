"use client";

import { useState } from "react";
import { openChatGptReflection } from "@/lib/ai/reflection";

/**
 * 「AI振り返り」ボタン。クリックするとプロンプト全文をクリップボードにコピーし、
 * ChatGPT を開く（入力欄には手動で貼り付ける）。
 * - prompt: 静的なプロンプト（サーバーで組み立て済みの場合）
 * - buildPrompt: クリック時に最新の入力状態からプロンプトを組み立てる場合
 */
export function AiReflectionButton({
  prompt,
  buildPrompt,
}: {
  prompt?: string;
  buildPrompt?: () => string;
}) {
  const [copied, setCopied] = useState(false);

  function handle() {
    const p = buildPrompt ? buildPrompt() : (prompt ?? "");
    if (!p.trim()) return;
    openChatGptReflection(p);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
    >
      {copied ? "✓ プロンプトをコピーしました（貼り付けて送信）" : "✨ AI振り返り"}
    </button>
  );
}
