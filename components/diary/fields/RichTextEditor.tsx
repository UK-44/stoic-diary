"use client";

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
  const editor = useEditor({
    immediatelyRender: false, // Next.js App Router の SSR でハイドレーション不整合を避ける
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder ?? "何か書く…" }),
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
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return <div className="tiptap text-zinc-600">{placeholder ?? "何か書く…"}</div>;
  }

  return (
    <>
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl"
      >
        <MarkBtn active={editor.isActive("bold")} title="太字 (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </MarkBtn>
        <MarkBtn active={editor.isActive("underline")} title="下線 (⌘U)" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </MarkBtn>
        <span className="mx-0.5 h-7 w-px bg-zinc-700" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title="文字色"
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-zinc-800"
          >
            <span className="h-5 w-5 rounded-full border border-zinc-600" style={{ backgroundColor: c }} />
          </button>
        ))}
        <button
          type="button"
          title="色をリセット"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ✕
        </button>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </>
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
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors ${
        active ? "bg-zinc-200 text-zinc-900" : "text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
