import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RatingTrend } from "./RatingTrend";

const bars = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[title]"));

describe("RatingTrend", () => {
  it("日ごとに棒と日付を出す", () => {
    const { container } = render(
      <RatingTrend
        cells={[
          { key: "2026-09-20", rating: 4 },
          { key: "2026-09-21", rating: null },
        ]}
      />,
    );

    expect(bars(container).map((b) => b.title)).toEqual(["2026-09-20: 4", "2026-09-21"]);
    expect(container).toHaveTextContent("2021");
  });

  it.each([
    { rating: 1, color: "bg-red-500/70" },
    { rating: 2, color: "bg-amber-500/70" },
    { rating: 3, color: "bg-lime-500/70" },
    { rating: 4, color: "bg-emerald-500/80" },
  ])("評価 $rating は $color", ({ rating, color }) => {
    const { container } = render(<RatingTrend cells={[{ key: "2026-09-20", rating }]} />);

    expect(bars(container)[0]).toHaveClass(color);
    expect(bars(container)[0]).toHaveStyle({ opacity: "1" });
  });

  it("未評価の日は灰色で薄く表示する", () => {
    const { container } = render(<RatingTrend cells={[{ key: "2026-09-20", rating: null }]} />);

    expect(bars(container)[0]).toHaveClass("bg-zinc-800");
    expect(bars(container)[0]).toHaveStyle({ opacity: "0.5" });
  });
});
