import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { LabeledText } from "./LabeledText";

describe("LabeledText", () => {
  it("ラベルごとに見出しと入力欄を出し、値を表示する", () => {
    render(
      <LabeledText groups={["Good", "Bad"]} value={{ Good: "<p>早起き</p>" }} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("Bad")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox").map((t) => (t as HTMLTextAreaElement).value)).toEqual([
      "<p>早起き</p>",
      "",
    ]);
  });

  it("変更したラベルの値だけを更新して通知する", () => {
    const onChange = vi.fn();
    render(
      <LabeledText
        groups={["Good", "Bad"]}
        value={{ Good: "<p>早起き</p>", Bad: "" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "<p>夜更かし</p>" } });

    expect(onChange).toHaveBeenCalledWith({ Good: "<p>早起き</p>", Bad: "<p>夜更かし</p>" });
  });
});
