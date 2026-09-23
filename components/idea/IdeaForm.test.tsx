import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { actions, router } = vi.hoisted(() => ({
  actions: {
    createIdea: vi.fn(),
    updateIdea: vi.fn(),
    deleteIdea: vi.fn(),
  },
  router: { push: vi.fn(), refresh: vi.fn() },
}));

vi.mock("@/lib/idea/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { IdeaForm, type IdeaFormValue } from "./IdeaForm";

const existing: IdeaFormValue = {
  id: "idea-1",
  title: "既存の見出し",
  content: "<p>既存のメモ</p>",
  rating: 2,
  label: "FAMILY",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("IdeaForm（新規作成）", () => {
  it("「追加」ボタンを表示し、「削除」ボタンは表示しない", () => {
    render(<IdeaForm />);

    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
  });

  it("入力した見出し・メモ・評価・ラベルで createIdea を呼ぶ", async () => {
    actions.createIdea.mockResolvedValue({ ok: true, id: "new-id" });
    const user = userEvent.setup();
    render(<IdeaForm />);

    await user.type(screen.getByPlaceholderText("見出し"), "朝に散歩する");
    await user.type(screen.getByLabelText("メモ（自由記述）"), "10分だけ");
    await user.click(screen.getByRole("button", { name: "4 つ星" }));
    await user.click(screen.getByRole("button", { name: "仕事" }));
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(actions.createIdea).toHaveBeenCalledWith({
      title: "朝に散歩する",
      content: "10分だけ",
      rating: 4,
      label: "WORK",
    });
  });

  it("作成に成功したら詳細ページへ遷移する", async () => {
    actions.createIdea.mockResolvedValue({ ok: true, id: "new-id" });
    const user = userEvent.setup();
    render(<IdeaForm />);

    await user.type(screen.getByPlaceholderText("見出し"), "朝に散歩する");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(router.push).toHaveBeenCalledWith("/idea/new-id");
  });

  it("作成に失敗したらエラーメッセージを表示し、遷移しない", async () => {
    actions.createIdea.mockResolvedValue({ ok: false, error: "見出しを入力してください" });
    const user = userEvent.setup();
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(await screen.findByText("見出しを入力してください")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("ラベルを再度押すと選択を解除する（label: null）", async () => {
    actions.createIdea.mockResolvedValue({ ok: true, id: "new-id" });
    const user = userEvent.setup();
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "家族" }));
    await user.click(screen.getByRole("button", { name: "家族" }));
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(actions.createIdea).toHaveBeenCalledWith(expect.objectContaining({ label: null }));
  });
});

describe("IdeaForm（編集）", () => {
  it("初期値（見出し・評価）を表示し、「保存」「削除」ボタンを表示する", () => {
    render(<IdeaForm initial={existing} />);

    expect(screen.getByPlaceholderText("見出し")).toHaveValue("既存の見出し");
    expect(screen.getByRole("button", { name: "2 つ星" })).toHaveClass("text-amber-400");
    expect(screen.getByRole("button", { name: "3 つ星" })).not.toHaveClass("text-amber-400");
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("保存すると updateIdea を id 付きで呼び、「保存しました」を表示して再描画する", async () => {
    actions.updateIdea.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.clear(screen.getByPlaceholderText("見出し"));
    await user.type(screen.getByPlaceholderText("見出し"), "変更後");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(actions.updateIdea).toHaveBeenCalledWith("idea-1", {
      title: "変更後",
      content: "<p>既存のメモ</p>",
      rating: 2,
      label: "FAMILY",
    });
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("保存に失敗したらエラーメッセージを表示し、再描画しない", async () => {
    actions.updateIdea.mockResolvedValue({ ok: false, error: "対象が見つかりません" });
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("対象が見つかりません")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("保存中はボタンを無効化し「保存中…」と表示する", async () => {
    let resolve!: (r: { ok: true }) => void;
    actions.updateIdea.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();

    resolve({ ok: true });
    expect(await screen.findByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("削除確認でキャンセルしたら削除しない", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(actions.deleteIdea).not.toHaveBeenCalled();
  });

  it("削除確認で OK なら deleteIdea を呼び、一覧へ遷移する", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    actions.deleteIdea.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(actions.deleteIdea).toHaveBeenCalledWith("idea-1");
    expect(router.push).toHaveBeenCalledWith("/idea");
  });

  it("削除に失敗したらエラーメッセージを表示する", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    actions.deleteIdea.mockResolvedValue({ ok: false, error: "対象が見つかりません" });
    const user = userEvent.setup();
    render(<IdeaForm initial={existing} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(await screen.findByText("対象が見つかりません")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
