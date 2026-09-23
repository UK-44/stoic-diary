import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { FixedMessage } from "./FixedMessage";

describe("FixedMessage", () => {
  it("文面を読み取り専用で表示する", () => {
    render(<FixedMessage message="<p>Keep simple.</p>" />);

    expect(screen.getByTestId("rich-text-readonly")).toHaveTextContent("<p>Keep simple.</p>");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it.each(["", "<p></p>", "<p> </p><p></p>"])("空の文面 %j なら何も表示しない", (message) => {
    const { container } = render(<FixedMessage message={message} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/x"></iframe></div>',
    '<iframe src="https://example.com"></iframe>',
  ])("テキストが無くても埋め込みがあれば表示する", (message) => {
    render(<FixedMessage message={message} />);

    expect(screen.getByTestId("rich-text-readonly")).toBeInTheDocument();
  });
});
