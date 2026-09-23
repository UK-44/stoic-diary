import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const { savePeriodReview } = vi.hoisted(() => ({ savePeriodReview: vi.fn() }));
vi.mock("@/lib/review/actions", () => ({ savePeriodReview }));
vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));

import { PeriodReflection, type ReviewFields } from "./PeriodReflection";

const initial: ReviewFields = {
  goal: "<p>毎日走る</p>",
  wentWell: "",
  couldImprove: "",
  nextActions: "",
};

const flushAutosave = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  savePeriodReview.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PeriodReflection", () => {
  it("週なら「週間目標」を見出しにする", () => {
    render(<PeriodReflection periodType="WEEK" periodStart="2026-09-20" initial={initial} />);

    expect(screen.getByText("週間目標")).toBeInTheDocument();
    expect(screen.getByLabelText("この週の目標")).toHaveValue("<p>毎日走る</p>");
  });

  it("月なら「月間目標」を見出しにする", () => {
    render(<PeriodReflection periodType="MONTH" periodStart="2026-09-01" initial={initial} />);

    expect(screen.getByText("月間目標")).toBeInTheDocument();
    expect(screen.getByLabelText("この月の目標")).toBeInTheDocument();
  });

  it("振り返りの 3 項目を表示する", () => {
    render(<PeriodReflection periodType="WEEK" periodStart="2026-09-20" initial={initial} />);

    for (const label of ["うまくできたこと", "もっと改善できたこと", "次のサイクルで取り組むこと"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("開いただけでは保存しない", async () => {
    render(<PeriodReflection periodType="WEEK" periodStart="2026-09-20" initial={initial} />);

    await flushAutosave();

    expect(savePeriodReview).not.toHaveBeenCalled();
  });

  it("入力から 800ms 後に全項目を保存し、「保存済み」を表示する", async () => {
    render(<PeriodReflection periodType="WEEK" periodStart="2026-09-20" initial={initial} />);

    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "<p>早起き</p>" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(savePeriodReview).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(savePeriodReview).toHaveBeenCalledWith({
      periodType: "WEEK",
      periodStart: "2026-09-20",
      goal: "<p>毎日走る</p>",
      wentWell: "<p>早起き</p>",
      couldImprove: "",
      nextActions: "",
    });
    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("保存に失敗したら「保存に失敗しました」を表示する", async () => {
    savePeriodReview.mockResolvedValue({ ok: false, error: "x" });
    render(<PeriodReflection periodType="WEEK" periodStart="2026-09-20" initial={initial} />);

    fireEvent.change(screen.getAllByRole("textbox")[3], { target: { value: "<p>22時就寝</p>" } });
    await flushAutosave();

    expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
  });
});
