import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxList } from "./CheckboxList";
import type { CheckboxListValue } from "@/lib/diary/types";

const items: CheckboxListValue = [
  { text: "買い物", checked: false },
  { text: "掃除", checked: true },
];

describe("CheckboxList", () => {
  it("項目をチェック状態つきで表示する", () => {
    render(<CheckboxList value={items} onChange={vi.fn()} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([false, true]);
    expect(screen.getByDisplayValue("買い物")).toBeInTheDocument();
  });

  it("Enter で項目を末尾に追加し、入力欄を空にする", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);
    const draft = screen.getByPlaceholderText("項目を追加");

    await userEvent.type(draft, "  洗濯  {Enter}");

    expect(onChange).toHaveBeenCalledWith([...items, { text: "洗濯", checked: false }]);
    expect(draft).toHaveValue("");
  });

  it("空白だけなら追加しない", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText("項目を追加"), "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("IME 変換中の Enter では追加しない", () => {
    const onChange = vi.fn();
    render(<CheckboxList value={[]} onChange={onChange} />);
    const draft = screen.getByPlaceholderText("項目を追加");

    fireEvent.change(draft, { target: { value: "せんたく" } });
    fireEvent.keyDown(draft, { key: "Enter", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(draft).toHaveValue("せんたく");
  });

  it("チェックを切り替えると、その項目だけ反転して通知する", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole("checkbox")[0]);

    expect(onChange).toHaveBeenCalledWith([
      { text: "買い物", checked: true },
      { text: "掃除", checked: true },
    ]);
  });

  it("チェック済みの項目を押すとチェックを外す", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole("checkbox")[1]);

    expect(onChange).toHaveBeenCalledWith([
      { text: "買い物", checked: false },
      { text: "掃除", checked: false },
    ]);
  });

  it("項目のテキストを編集すると通知する", () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue("掃除"), { target: { value: "風呂掃除" } });

    expect(onChange).toHaveBeenCalledWith([
      { text: "買い物", checked: false },
      { text: "風呂掃除", checked: true },
    ]);
  });

  it("削除ボタンでその項目を取り除く", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);

    expect(onChange).toHaveBeenCalledWith([{ text: "掃除", checked: true }]);
  });

  it("2 番目の項目を削除すると、それだけを取り除く", async () => {
    const onChange = vi.fn();
    render(<CheckboxList value={items} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole("button", { name: "削除" })[1]);

    expect(onChange).toHaveBeenCalledWith([{ text: "買い物", checked: false }]);
  });

  it("設定のプレースホルダを追加欄に使う", () => {
    render(<CheckboxList value={[]} placeholder="今日やること" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("今日やること")).toBeInTheDocument();
  });
});
