import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ResolvedComponent, ResolvedForm } from "@/lib/diary/types";

const { saveDiaryEntry, openChatGptReflection } = vi.hoisted(() => ({
  saveDiaryEntry: vi.fn(),
  openChatGptReflection: vi.fn(),
}));

vi.mock("@/lib/diary/actions", () => ({ saveDiaryEntry }));
vi.mock("@/lib/ai/reflection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/reflection")>()),
  openChatGptReflection,
}));
vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { DiaryEditor } from "./DiaryEditor";

const component = (overrides: Partial<ResolvedComponent>): ResolvedComponent => ({
  componentId: "c",
  key: "c",
  name: "項目",
  type: "RICH_TEXT",
  config: {},
  message: null,
  value: null,
  habit: null,
  ...overrides,
});

const form: ResolvedForm = {
  components: [
    component({ componentId: "goal", name: "今日の目標", value: "<p>10km 走る</p>" }),
    component({
      componentId: "msg",
      name: "マイメッセージ",
      type: "FIXED_MESSAGE",
      message: "<p>Keep simple.</p>",
    }),
    component({ componentId: "todo", name: "やること", type: "CHECKBOX_LIST", value: null }),
    // 旧形式（文字列配列）の値は表示時に HTML へ変換される。
    component({ componentId: "memo", name: "メモ", value: ["旧メモ"] as unknown as string }),
  ],
};

const renderEditor = (props: Partial<Parameters<typeof DiaryEditor>[0]> = {}) =>
  render(
    <DiaryEditor
      dateKey="2026-09-24"
      form={form}
      initialRating={null}
      existing
      longTermGoal="フルマラソン完走"
      longTermGoalDate="2027-03-01"
      {...props}
    />,
  );

/** 自動保存のデバウンスを進め、保存完了まで待つ。 */
const flushAutosave = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  saveDiaryEntry.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DiaryEditor（未記入の日）", () => {
  it("「日記を書く」を表示し、フォームは出さない", () => {
    renderEditor({ existing: false });

    expect(screen.getByText("この日の日記はまだありません。")).toBeInTheDocument();
    expect(screen.queryByText("総合評価")).not.toBeInTheDocument();
  });

  it("「日記を書く」を押すとフォームを開き、すぐに空のエントリを保存する", async () => {
    renderEditor({ existing: false });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "日記を書く" }));
    });

    expect(screen.getByText("総合評価")).toBeInTheDocument();
    expect(saveDiaryEntry).toHaveBeenCalledTimes(1);
    expect(saveDiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ dateKey: "2026-09-24", rating: null }),
    );
  });
});

describe("DiaryEditor（記入済みの日）", () => {
  it("項目を並び順どおりに表示する", () => {
    renderEditor();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["総合評価", "今日の目標", "マイメッセージ", "やること", "メモ"]);
  });

  it("既存の値と、旧形式を変換した値を入力欄に表示する", () => {
    renderEditor();

    expect(screen.getByDisplayValue("<p>10km 走る</p>")).toBeInTheDocument();
    expect(screen.getByDisplayValue("<ul><li><p>旧メモ</p></li></ul>")).toBeInTheDocument();
  });

  it("開いただけでは保存しない", async () => {
    renderEditor();

    await flushAutosave();

    expect(saveDiaryEntry).not.toHaveBeenCalled();
  });

  it("総合評価を選ぶと 800ms 後に自動保存する", async () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "良い" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(saveDiaryEntry).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({ rating: 3 }));
  });

  it("選択中の総合評価をもう一度押すと解除する", async () => {
    renderEditor({ initialRating: 3 });

    fireEvent.click(screen.getByRole("button", { name: "良い" }));
    await flushAutosave();

    expect(saveDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({ rating: null }));
  });

  it("続けて変更したら、最後の変更から 800ms 後に 1 回だけ保存する", async () => {
    renderEditor();

    fireEvent.change(screen.getByDisplayValue("<p>10km 走る</p>"), {
      target: { value: "<p>5km</p>" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.click(screen.getByRole("button", { name: "最高" }));
    await flushAutosave();

    expect(saveDiaryEntry).toHaveBeenCalledTimes(1);
    expect(saveDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({ rating: 4 }));
  });

  it("固定メッセージ以外の全項目の値を保存する（未入力は空の値）", async () => {
    renderEditor();

    fireEvent.change(screen.getByDisplayValue("<p>10km 走る</p>"), {
      target: { value: "<p>5km</p>" },
    });
    await flushAutosave();

    expect(saveDiaryEntry).toHaveBeenCalledWith({
      dateKey: "2026-09-24",
      rating: null,
      values: [
        { componentId: "goal", value: "<p>5km</p>" },
        { componentId: "todo", value: [] },
        { componentId: "memo", value: "<ul><li><p>旧メモ</p></li></ul>" },
      ],
    });
  });

  it("保存中は「保存中…」、完了したら「保存済み」を表示する", async () => {
    let resolve!: (r: { ok: true }) => void;
    saveDiaryEntry.mockReturnValue(new Promise((r) => (resolve = r)));
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "良い" }));
    await flushAutosave();
    expect(screen.getByText("保存中…")).toBeInTheDocument();

    await act(async () => resolve({ ok: true }));
    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("保存に失敗したら「保存に失敗しました」を表示する", async () => {
    saveDiaryEntry.mockResolvedValue({ ok: false, error: "保存に失敗しました" });
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "良い" }));
    await flushAutosave();

    expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
  });

  it("AI 振り返りは押した時点の入力と長期目標からプロンプトを作る", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "悪い" }));
    fireEvent.click(screen.getByRole("button", { name: /AI振り返り/ }));

    const prompt = openChatGptReflection.mock.calls[0][0] as string;
    expect(prompt).toContain("フルマラソン完走（〜2027-03-01）");
    expect(prompt).toContain("総合評価: 悪い");
    expect(prompt).toContain("【今日の目標】\n10km 走る");
    expect(prompt).not.toContain("【マイメッセージ】");
  });
});
