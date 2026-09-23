import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { isRichTextEmpty, StaticRichText } from "./StaticRichText";

describe("isRichTextEmpty", () => {
  it.each(["", "<p></p>", "<p> </p><p></p>"])("%j は空とみなす", (html) => {
    expect(isRichTextEmpty(html)).toBe(true);
  });

  it.each([
    "<p>走る</p>",
    '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/x"></iframe></div>',
    '<iframe src="https://example.com"></iframe>',
  ])("%j は空ではない", (html) => {
    expect(isRichTextEmpty(html)).toBe(false);
  });
});

describe("StaticRichText", () => {
  it("HTML を .tiptap の中にそのまま描画する", () => {
    const { container } = render(<StaticRichText html="<ul><li><p><strong>走る</strong></p></li></ul>" />);

    const root = container.querySelector(".tiptap")!;
    expect(root.querySelector("ul li strong")).toHaveTextContent("走る");
  });

  it("空ならプレースホルダを TipTap と同じ形で出す", () => {
    const { container } = render(<StaticRichText html="<p></p>" placeholder="Write" />);

    const p = container.querySelector(".tiptap p.is-editor-empty")!;
    expect(p).toHaveAttribute("data-placeholder", "Write");
  });

  it("プレースホルダ未指定なら空でもプレースホルダを出さない", () => {
    const { container } = render(<StaticRichText html="" />);

    expect(container.querySelector(".is-editor-empty")).toBeNull();
  });
});
