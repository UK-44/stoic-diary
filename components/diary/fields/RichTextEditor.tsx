"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { TextSelection } from "@tiptap/pm/state";

const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#c084fc"];

type Props = {
  value: string;
  placeholder?: string;
  onChange: (html: string) => void;
};

/**
 * Notion 風のリッチテキスト入力（TipTap）。
 * - 枠・常時ツールバーは持たず、本文として地続きに編集する
 * - 行頭 "- " で箇条書き、Tab でネスト
 * - 文字を選択した時だけバブルメニュー（太字 / 下線 / 文字色）が出る
 * - ⌘/Ctrl+B, ⌘/Ctrl+U も使える
 * 保存形式は HTML 文字列。
 */
export function RichTextEditor({ value, placeholder, onChange }: Props) {
  // handleKeyDown は useEditor の設定時点で固定されるため、最新の editor を
  // ref 経由で参照する（Tab のリスト階層操作で使う）。
  const editorRef = useRef<Editor | null>(null);
  // スマホでフォーカス中だけキーボード上にリスト階層バーを出すための状態。
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, // Next.js App Router の SSR でハイドレーション不整合を避ける
    extensions: [
      // trailingNode: 末尾に常に空段落を強制する拡張。リスト後に消せない空行が
      // 残るため無効化する。
      StarterKit.configure({ trailingNode: false }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder ?? "Write" }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap" },
      // Esc で選択を解除 → バブルメニューを閉じる（キャレットは残す）。
      handleKeyDown: (view, event) => {
        if (event.key === "Escape" && !view.state.selection.empty) {
          const pos = view.state.selection.to;
          view.dispatch(
            view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
          );
          return true;
        }
        // Tab はリスト階層の上げ下げに使い、フォーカスがフォーム外へ逃げないよう
        // 常に消費する（先頭項目など階層を変えられない位置でも次の入力へ移動しない）。
        if (event.key === "Tab") {
          const ed = editorRef.current;
          if (ed) {
            const chain = ed.chain().focus();
            (event.shiftKey
              ? chain.liftListItem("listItem")
              : chain.sinkListItem("listItem")
            ).run();
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });
  editorRef.current = editor;

  if (!editor) {
    return <div className="tiptap text-zinc-600">{placeholder ?? "Write"}</div>;
  }

  // 装飾を適用したら選択を折りたたみ、バブルメニューを閉じる。
  const apply = (
    build: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>,
  ) => {
    const to = editor.state.selection.to;
    build(editor.chain().focus()).setTextSelection(to).run();
  };

  return (
    <>
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl"
      >
        <MarkBtn active={editor.isActive("bold")} title="太字 (⌘B)" onClick={() => apply((c) => c.toggleBold())}>
          <span className="font-bold">B</span>
        </MarkBtn>
        <MarkBtn active={editor.isActive("underline")} title="下線 (⌘U)" onClick={() => apply((c) => c.toggleUnderline())}>
          <span className="underline">U</span>
        </MarkBtn>
        <span className="mx-0.5 h-7 w-px bg-zinc-700" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title="文字色"
            onClick={() => apply((chain) => chain.setColor(c))}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-zinc-800"
          >
            <span className="h-5 w-5 rounded-full border border-zinc-600" style={{ backgroundColor: c }} />
          </button>
        ))}
        <button
          type="button"
          title="色をリセット"
          onClick={() => apply((c) => c.unsetColor())}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ✕
        </button>
      </BubbleMenu>
      <EditorContent editor={editor} />
      {/* スマホ: フォーカス中だけキーボード直上にリスト階層バーを出す */}
      {focused && <MobileListBar editor={editor} />}
    </>
  );
}

/**
 * スマホ向け：ソフトキーボードの直上に出すリスト階層バー（⇤ 上げる / ⇥ 下げる）。
 * Tab が打てない端末用。visualViewport でキーボードの高さを検知して追従させる。
 */
function MobileListBar({ editor }: { editor: Editor }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // キーボードが占める高さ（= レイアウト下端と表示領域下端の差）だけ持ち上げる。
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (ref.current) ref.current.style.transform = `translateY(-${offset}px)`;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // タップでキャレット（フォーカス）が外れないよう onMouseDown で preventDefault。
  const run = (sink: boolean) => {
    const chain = editor.chain().focus();
    (sink ? chain.sinkListItem("listItem") : chain.liftListItem("listItem")).run();
  };

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-zinc-700 bg-zinc-900 px-3 py-2 md:hidden"
    >
      <ListLevelBtn onClick={() => run(false)}>
        <span aria-hidden>←</span>
      </ListLevelBtn>
      <ListLevelBtn onClick={() => run(true)}>
        <span aria-hidden>→</span>
      </ListLevelBtn>
    </div>
  );
}

function ListLevelBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 text-sm text-zinc-200 transition-colors active:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function MarkBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors ${active ? "bg-zinc-200 text-zinc-900" : "text-zinc-200 hover:bg-zinc-800"
        }`}
    >
      {children}
    </button>
  );
}
