"use client";

import { lazy, Suspense } from "react";
import { StaticRichText } from "./StaticRichText";

// TipTap（ProseMirror 一式・gzip で約 150KB）は別チャンクに分けて遅延ロードする。
// ページのハイドレーションがこのチャンクの読み込みを待たずに済む。
const TiptapEditor = lazy(() =>
  import("./TiptapEditor").then((m) => ({ default: m.TiptapEditor })),
);

type Props = {
  value: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  /** false で読み取り専用表示（本文レンダリングのみ・編集UIなし・TipTap を読み込まない）。 */
  editable?: boolean;
};

/**
 * リッチテキスト入力。SSR と TipTap 読み込み中は本文を静的 HTML で表示し、
 * 読み込めたら同じ見た目のまま編集可能なエディタ（TiptapEditor）に差し替える。
 */
export function RichTextEditor({ value, placeholder, onChange, editable = true }: Props) {
  if (!editable) return <StaticRichText html={value} />;
  return (
    <Suspense fallback={<StaticRichText html={value} placeholder={placeholder ?? "Write"} />}>
      <TiptapEditor value={value} placeholder={placeholder} onChange={onChange} />
    </Suspense>
  );
}
