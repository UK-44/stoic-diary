import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { actions, router } = vi.hoisted(() => ({
  actions: {
    createComponent: vi.fn(),
    updateComponent: vi.fn(),
    deleteComponent: vi.fn(),
    moveComponent: vi.fn(),
    reorderComponents: vi.fn(),
  },
  router: { refresh: vi.fn() },
}));
vi.mock("@/lib/settings/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { ComponentManager, type ComponentRow } from "./ComponentManager";

const row = (overrides: Partial<ComponentRow>): ComponentRow => ({
  id: "c",
  name: "項目",
  type: "RICH_TEXT",
  placeholder: "",
  groups: [],
  message: "",
  habits: [],
  ...overrides,
});

const components: ComponentRow[] = [
  row({ id: "a", name: "今日の目標", type: "RICH_TEXT", placeholder: "目標" }),
  row({ id: "b", name: "Good/Bad", type: "LABELED_TEXT", groups: ["Good", "Bad"] }),
  row({ id: "c", name: "マイメッセージ", type: "FIXED_MESSAGE", message: "<p>Keep simple.</p>" }),
];

/** 一覧の 1 行（項目名から引く）。 */
const item = (name: string) => screen.getByText(name).closest<HTMLElement>("[draggable]")!;
/** 一覧に表示されている項目名（上から順）。 */
const itemNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[draggable]")).map(
    (el) => components.map((c) => c.name).find((n) => el.textContent!.includes(n))!,
  );
const addPanel = () => screen.getByText("項目を追加").parentElement!;
const nameInput = () => within(addPanel()).getByPlaceholderText(/項目名/);

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  for (const fn of Object.values(actions)) fn.mockResolvedValue({ ok: true });
});

describe("ComponentManager（一覧）", () => {
  it("項目を並び順どおりに種類名つきで表示する", () => {
    const { container } = render(<ComponentManager components={components} />);

    expect(within(item("今日の目標")).getByText("フリー")).toBeInTheDocument();
    expect(within(item("Good/Bad")).getByText("ラベル付き")).toBeInTheDocument();
    expect(within(item("マイメッセージ")).getByText("固定メッセージ")).toBeInTheDocument();
    expect(itemNames(container)).toEqual(["今日の目標", "Good/Bad", "マイメッセージ"]);
  });
});

describe("ComponentManager（追加）", () => {
  it("フリーは項目名とプレースホルダで作成する", async () => {
    render(<ComponentManager components={components} />);

    await userEvent.type(nameInput(), "メモ");
    await userEvent.type(within(addPanel()).getByPlaceholderText("プレースホルダ（任意）"), "自由に");
    await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

    expect(actions.createComponent).toHaveBeenCalledWith("RICH_TEXT", {
      name: "メモ",
      placeholder: "自由に",
      groups: undefined,
      message: undefined,
      habits: undefined,
    });
  });

  it("ラベル付きはカンマ区切りをラベル配列にして作成する", async () => {
    render(<ComponentManager components={components} />);

    await userEvent.click(screen.getByRole("button", { name: /^ラベル付き/ }));
    await userEvent.type(nameInput(), "振り返り");
    const groups = within(addPanel()).getByPlaceholderText(/ラベル（カンマ区切り/);
    await userEvent.clear(groups);
    await userEvent.type(groups, "Keep, Problem,, Try ");
    await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

    expect(actions.createComponent).toHaveBeenCalledWith(
      "LABELED_TEXT",
      expect.objectContaining({ groups: ["Keep", "Problem", "Try"], placeholder: undefined }),
    );
  });

  it("固定メッセージは入力した文面で作成する", async () => {
    render(<ComponentManager components={components} />);

    await userEvent.click(screen.getByRole("button", { name: /^固定メッセージ/ }));
    await userEvent.type(nameInput(), "朝");
    fireEvent.change(within(addPanel()).getByRole("textbox", { name: /表示する固定メッセージ/ }), {
      target: { value: "<p>おはよう</p>" },
    });
    await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

    expect(actions.createComponent).toHaveBeenCalledWith(
      "FIXED_MESSAGE",
      expect.objectContaining({ message: "<p>おはよう</p>" }),
    );
  });

  it("テンプレに応じて追加用の入力欄が切り替わる", async () => {
    render(<ComponentManager components={components} />);

    expect(within(addPanel()).getByPlaceholderText("プレースホルダ（任意）")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^チェックリスト/ }));
    expect(within(addPanel()).getByPlaceholderText("項目追加欄のプレースホルダ（任意）")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^習慣/ }));
    expect(within(addPanel()).queryByPlaceholderText(/プレースホルダ/)).not.toBeInTheDocument();
    expect(within(addPanel()).getByPlaceholderText(/習慣名/)).toBeInTheDocument();
  });

  describe("習慣", () => {
    it("習慣行を追加し、名前と難易度を選んで作成する", async () => {
      render(<ComponentManager components={components} />);

      await userEvent.click(screen.getByRole("button", { name: /^習慣/ }));
      await userEvent.type(nameInput(), "習慣");
      await userEvent.click(screen.getByRole("button", { name: "＋ 習慣を追加" }));
      const [first, second] = within(addPanel()).getAllByPlaceholderText(/習慣名/);
      await userEvent.type(first, "読書");
      await userEvent.type(second, "瞑想");
      const hardButtons = within(addPanel()).getAllByRole("button", { name: /難しい/ });
      await userEvent.click(hardButtons[1]);
      await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

      const habits = actions.createComponent.mock.calls[0][1].habits;
      expect(habits.map((h: { name: string; difficulty: string }) => [h.name, h.difficulty])).toEqual([
        ["読書", "NORMAL"],
        ["瞑想", "HARD"],
      ]);
    });

    it("難易度ボタンに目標日数を表示する", async () => {
      render(<ComponentManager components={components} />);

      await userEvent.click(screen.getByRole("button", { name: /^習慣/ }));

      expect(within(addPanel()).getByRole("button", { name: /簡単\s*21日/ })).toBeInTheDocument();
      expect(within(addPanel()).getByRole("button", { name: /普通\s*66日/ })).toBeInTheDocument();
      expect(within(addPanel()).getByRole("button", { name: /難しい\s*90日/ })).toBeInTheDocument();
    });

    it("習慣が 1 行だけなら削除できず、2 行以上なら削除できる", async () => {
      render(<ComponentManager components={components} />);
      await userEvent.click(screen.getByRole("button", { name: /^習慣/ }));

      expect(within(addPanel()).queryByRole("button", { name: "この習慣を削除" })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "＋ 習慣を追加" }));
      const [first, second] = within(addPanel()).getAllByPlaceholderText(/習慣名/);
      await userEvent.type(first, "読書");
      await userEvent.type(second, "瞑想");
      await userEvent.click(within(addPanel()).getAllByRole("button", { name: "この習慣を削除" })[1]);

      const rest = within(addPanel()).getAllByPlaceholderText(/習慣名/);
      expect(rest.map((i) => (i as HTMLInputElement).value)).toEqual(["読書"]);
    });
  });

  it("追加に成功したら「追加しました」を表示して再描画し、項目名を空にする", async () => {
    render(<ComponentManager components={components} />);

    await userEvent.type(nameInput(), "メモ");
    await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

    expect(await screen.findByText("追加しました")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });

  it("追加に失敗したらエラーを表示し、再描画しない", async () => {
    actions.createComponent.mockResolvedValue({ ok: false, error: "項目名を入力してください" });
    render(<ComponentManager components={components} />);

    await userEvent.click(within(addPanel()).getByRole("button", { name: "追加" }));

    expect(await screen.findByText("項目名を入力してください")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe("ComponentManager（編集・削除）", () => {
  it("編集を開くと現在の設定を表示し、更新で updateComponent を呼ぶ", async () => {
    render(<ComponentManager components={components} />);
    const target = item("Good/Bad");

    await userEvent.click(within(target).getByRole("button", { name: "編集" }));
    const groups = within(target).getByPlaceholderText("ラベル（カンマ区切り）");
    expect(groups).toHaveValue("Good, Bad");
    await userEvent.clear(groups);
    await userEvent.type(groups, "Good, Bad, Next");
    await userEvent.click(within(target).getByRole("button", { name: "更新" }));

    expect(actions.updateComponent).toHaveBeenCalledWith("b", {
      name: "Good/Bad",
      placeholder: undefined,
      groups: ["Good", "Bad", "Next"],
      message: undefined,
      habits: undefined,
    });
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
  });

  it("編集は「閉じる」で閉じられる", async () => {
    render(<ComponentManager components={components} />);
    const target = item("今日の目標");

    await userEvent.click(within(target).getByRole("button", { name: "編集" }));
    await userEvent.click(within(target).getByRole("button", { name: "閉じる" }));

    expect(within(target).queryByRole("button", { name: "更新" })).not.toBeInTheDocument();
  });

  it("削除確認でキャンセルしたら削除しない", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ComponentManager components={components} />);

    await userEvent.click(within(item("今日の目標")).getByRole("button", { name: "削除" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("「今日の目標」を削除します"));
    expect(actions.deleteComponent).not.toHaveBeenCalled();
  });

  it("削除確認で OK なら削除し、「削除しました」を表示する", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ComponentManager components={components} />);

    await userEvent.click(within(item("今日の目標")).getByRole("button", { name: "削除" }));

    expect(actions.deleteComponent).toHaveBeenCalledWith("a");
    expect(await screen.findByText("削除しました")).toBeInTheDocument();
  });
});

describe("ComponentManager（並べ替え）", () => {
  it("▲▼ で 1 つ上 / 下へ移動する", async () => {
    render(<ComponentManager components={components} />);

    await userEvent.click(within(item("Good/Bad")).getByRole("button", { name: "上へ" }));
    expect(actions.moveComponent).toHaveBeenCalledWith("b", "up");

    await userEvent.click(within(item("Good/Bad")).getByRole("button", { name: "下へ" }));
    expect(actions.moveComponent).toHaveBeenCalledWith("b", "down");
  });

  it("先頭の▲と末尾の▼は押せない", () => {
    render(<ComponentManager components={components} />);

    expect(within(item("今日の目標")).getByRole("button", { name: "上へ" })).toBeDisabled();
    expect(within(item("今日の目標")).getByRole("button", { name: "下へ" })).toBeEnabled();
    expect(within(item("マイメッセージ")).getByRole("button", { name: "下へ" })).toBeDisabled();
  });

  it("グリップを掴んだ行だけドラッグできる", () => {
    render(<ComponentManager components={components} />);

    expect(item("今日の目標")).toHaveAttribute("draggable", "false");
    fireEvent.mouseDown(within(item("今日の目標")).getByRole("button", { name: "ドラッグして並び替え" }));

    expect(item("今日の目標")).toHaveAttribute("draggable", "true");
    expect(item("Good/Bad")).toHaveAttribute("draggable", "false");
  });

  it("ドラッグで並べ替えると、新しい順序で保存する", () => {
    render(<ComponentManager components={components} />);
    const from = item("マイメッセージ");

    fireEvent.mouseDown(within(from).getByRole("button", { name: "ドラッグして並び替え" }));
    fireEvent.dragStart(from);
    fireEvent.dragEnter(item("今日の目標"));
    fireEvent.dragEnd(from);

    expect(actions.reorderComponents).toHaveBeenCalledWith(["c", "a", "b"]);
  });

  it("ドラッグしても順序が変わらなければ保存しない", () => {
    render(<ComponentManager components={components} />);
    const from = item("Good/Bad");

    fireEvent.dragStart(from);
    fireEvent.dragEnter(from);
    fireEvent.dragEnd(from);

    expect(actions.reorderComponents).not.toHaveBeenCalled();
  });

  it("サーバーから新しい一覧が届いたら表示を置き換える", () => {
    const { rerender } = render(<ComponentManager components={components} />);

    rerender(<ComponentManager components={[components[1]]} />);

    expect(screen.queryByText("今日の目標")).not.toBeInTheDocument();
    expect(screen.getByText("Good/Bad")).toBeInTheDocument();
  });
});
