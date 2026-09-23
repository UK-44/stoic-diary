import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "./StarRating";

const star = (n: number) => screen.getByRole("button", { name: `${n} つ星` });

describe("StarRating", () => {
  it("星ボタンを 5 つ表示する", () => {
    render(<StarRating value={0} />);

    expect(screen.getAllByRole("button", { name: /つ星$/ })).toHaveLength(5);
  });

  it("value 個までの星が点灯する", () => {
    render(<StarRating value={3} />);

    expect(star(3)).toHaveClass("text-amber-400");
    expect(star(4)).not.toHaveClass("text-amber-400");
  });

  it("n 番目の星を押すと n を通知する", async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);

    await userEvent.click(star(4));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("現在値と同じ星を押すと 0（未評価）を通知する", async () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);

    await userEvent.click(star(2));

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("readOnly のときは押せない", async () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} readOnly />);

    await userEvent.click(star(5));

    expect(star(5)).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
