// RichTextEditor（TipTap）のテスト用スタブ。jsdom では contenteditable の入力を
// 再現できないため、値の受け渡しだけをテキストエリアで再現する。
// 使い方: vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));
type Props = {
  value: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
};

export function RichTextEditor({ value, placeholder, onChange, editable = true }: Props) {
  if (!editable) return <div data-testid="rich-text-readonly">{value}</div>;
  return (
    <textarea
      aria-label={placeholder ?? "Write"}
      defaultValue={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
