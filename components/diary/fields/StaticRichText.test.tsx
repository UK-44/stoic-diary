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

  it("空行（空の段落）には <br> を入れて 1 行分の高さを持たせる", () => {
    const { container } = render(<StaticRichText html="<p>一行目</p><p></p><p>三行目</p>" />);

    const paragraphs = container.querySelectorAll(".tiptap > p");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1].innerHTML).toBe("<br>");
  });

  it("空行が続いても、それぞれに <br> を入れる", () => {
    const { container } = render(<StaticRichText html="<p>a</p><p></p><p></p><p>b</p>" />);

    const blanks = Array.from(container.querySelectorAll(".tiptap > p")).filter(
      (p) => p.textContent === "",
    );
    expect(blanks.map((p) => p.innerHTML)).toEqual(["<br>", "<br>"]);
  });

  it("属性つきの空の段落にも <br> を入れる", () => {
    const { container } = render(<StaticRichText html={'<p>a</p><p style="text-align: center"></p>'} />);

    const blank = container.querySelectorAll(".tiptap > p")[1];
    expect(blank).toHaveAttribute("style", "text-align: center");
    expect(blank.innerHTML).toBe("<br>");
  });

  it("中身のある段落はそのまま描画する", () => {
    const { container } = render(<StaticRichText html="<p>走る</p><p><strong>読む</strong></p>" />);

    expect(container.querySelector(".tiptap")!.innerHTML).toBe(
      "<p>走る</p><p><strong>読む</strong></p>",
    );
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
