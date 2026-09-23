/** テキストも埋め込みも無い（<p></p> 等の空段落だけの）HTML なら true。 */
export function isRichTextEmpty(html: string): boolean {
  const hasText = html.replace(/<[^>]*>/g, "").trim() !== "";
  const hasEmbed = html.includes("data-youtube-video") || html.includes("<iframe");
  return !hasText && !hasEmbed;
}

/**
 * リッチテキスト（TipTap が保存した HTML）を静的に描画する。TipTap を読み込まずに済むので
 * 読み取り専用表示や、エディタ読み込み前のプレースホルダ（SSR 出力）に使う。
 * DOM は TipTap の EditorContent（div > .tiptap）に揃え、差し替え時に見た目がずれないようにする。
 * HTML はオーナー本人がエディタで保存したものだけを想定している。
 */
export function StaticRichText({ html, placeholder }: { html: string; placeholder?: string }) {
  if (placeholder !== undefined && isRichTextEmpty(html)) {
    return (
      <div>
        <div className="tiptap">
          <p className="is-editor-empty" data-placeholder={placeholder} />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="tiptap" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
