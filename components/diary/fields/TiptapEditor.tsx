"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube, {
  getEmbedUrlFromYoutubeUrl,
  isValidYoutubeUrl,
} from "@tiptap/extension-youtube";
import { TextSelection } from "@tiptap/pm/state";
import { StaticRichText } from "./StaticRichText";

const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#c084fc"];

/**
 * YouTube 埋め込みの NodeView。iframe がクリックを奪うためノード選択で消せず、
 * さらに末尾に段落が無いとカーソルも置けない。ホバー削除ボタンを重ねて必ず
 * 消せるようにする。保存用の renderHTML は既定のまま（div[data-youtube-video]）。
 */
function YoutubeNodeView({ node, deleteNode, editor }: NodeViewProps) {
  const src =
    getEmbedUrlFromYoutubeUrl({
      url: node.attrs.src as string,
      nocookie: true,
      controls: true,
      allowFullscreen: true,
      startAt: (node.attrs.start as number) || 0,
      rel: 1,
    }) ?? (node.attrs.src as string);
  return (
    <NodeViewWrapper data-youtube-video="" className="relative">
      {editor.isEditable && (
        <button
          type="button"
          contentEditable={false}
          onClick={() => deleteNode()}
          aria-label="動画を削除"
          className="absolute right-2 top-2 z-10 rounded bg-zinc-900/80 px-2 py-0.5 text-xs text-zinc-200 opacity-70 transition-opacity hover:bg-zinc-800 hover:opacity-100"
        >
          ✕ 削除
        </button>
      )}
      <iframe
        src={src}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </NodeViewWrapper>
  );
}

// 削除ボタン付き NodeView を差し込んだ YouTube 拡張。
const YoutubeEmbed = Youtube.extend({
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeNodeView);
  },
});

type Props = {
  value: string;
  placeholder?: string;
  onChange?: (html: string) => void;
};

/**
 * Notion 風のリッチテキスト入力（TipTap）。重いので RichTextEditor から遅延ロードされる。
 * - 枠・常時ツールバーは持たず、本文として地続きに編集する
 * - 行頭 "- " で箇条書き、Tab でネスト
 * - 文字を選択した時だけバブルメニュー（太字 / 下線 / 文字色）が出る
 * - ⌘/Ctrl+B, ⌘/Ctrl+U も使える
 * 保存形式は HTML 文字列。
 */
export function TiptapEditor({ value, placeholder, onChange }: Props) {
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
      // link.shouldAutoLink: YouTube URL はリンク化せず（autolink / linkOnPaste の両方で
      // 除外）、YouTube 拡張側の埋め込み変換を優先させる。除外しないと URL が
      // ただのリンク文字列になってしまう。
      StarterKit.configure({
        trailingNode: false,
        link: { shouldAutoLink: (url) => !isValidYoutubeUrl(url) },
      }),
      TextStyle,
      Color,
      // YouTube 埋め込み。URL を貼り付けると自動でプレイヤーに変換される
      // （addPasteHandler は既定 true）。nocookie でプライバシー強化ドメインを使う。
      YoutubeEmbed.configure({ nocookie: true, width: 640, height: 360 }),
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
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });
  editorRef.current = editor;

  // エディタ生成前（SSR・ハイドレーション直後）は本文を静的 HTML で出しておく。
  // SSR 出力と一致させることで、JS 読み込み前から本文が見え、差し替え時もちらつかない。
  if (!editor) {
    return <StaticRichText html={value} placeholder={placeholder ?? "Write"} />;
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

  // body 直下へポータルする。エディタの祖先に transform/アニメーションがあると
  // position:fixed がそのコンテナ基準になり、キーボードに追従しないため。
  return createPortal(
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
    </div>,
    document.body,
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
