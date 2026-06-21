type Props = {
  message: string;
};

/** 固定表示メッセージ（入力なし・読み取り専用）。朝/夜のマイメッセージに使う。 */
export function FixedMessage({ message }: Props) {
  return (
    <blockquote className="border-l-2 border-zinc-600 pl-4 text-zinc-400 whitespace-pre-line">
      {message}
    </blockquote>
  );
}
