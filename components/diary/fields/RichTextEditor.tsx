"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";

const COLORS = ["#fca5a5", "#fcd34d", "#86efac", "#93c5fd", "#d8b4fe", "#ffffff"];

type Props = {
  value: string;
  placeholder?: string;
  onChange: (html: string) => void;
};

/**
 * Notion 風のリッチテキスト入力（TipTap）。
 * - 行頭 "- " で箇条書き、Tab でネスト
 * - 太字 / 下線 / 文字色
 * 保存形式は HTML 文字列。
 */
export function RichTextEditor({ value, placeholder, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // Next.js App Router の SSR でハイドレーション不整合を避ける
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder ?? "入力…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[2.5rem] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm leading-relaxed outline-none focus:border-zinc-500",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div className="min-h-[2.5rem] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-600">
        {placeholder ?? "入力…"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="太字">
        <span className="font-bold">B</span>
      </Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下線">
        <span className="underline">U</span>
      </Btn>
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="箇条書き">
        ⋮≡
      </Btn>
      <span className="mx-1 h-4 w-px bg-zinc-700" />
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title="文字色"
          onClick={() => editor.chain().focus().setColor(c).run()}
          className="h-4 w-4 rounded-full border border-zinc-700"
          style={{ backgroundColor: c }}
        />
      ))}
      <button
        type="button"
        title="色をリセット"
        onClick={() => editor.chain().focus().unsetColor().run()}
        className="ml-1 text-xs text-zinc-500 hover:text-zinc-200"
      >
        ✕
      </button>
    </div>
  );
}

function Btn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs transition-colors ${
        active ? "bg-zinc-200 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
