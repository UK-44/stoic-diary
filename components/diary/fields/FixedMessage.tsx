import { RichTextEditor } from "./RichTextEditor";
import { isRichTextEmpty } from "./StaticRichText";

type Props = {
  message: string;
};

/**
 * 固定表示メッセージ（入力なし・読み取り専用）。朝/夜のマイメッセージに使う。
 * markdown 由来の装飾や YouTube 埋め込みを含む HTML を読み取り専用でレンダリングする。
 */
export function FixedMessage({ message }: Props) {
  // 空段落だけ（<p></p> 等）のときは何も表示しない。
  if (isRichTextEmpty(message)) return null;
  return (
    <blockquote className="border-l-2 border-zinc-600 pl-4 text-zinc-400">
      <RichTextEditor value={message} editable={false} />
    </blockquote>
  );
}
