import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekStrip } from "./WeekStrip";

// 2026-09-24（木）を含む週は 9/20（日）〜 9/26（土）。
const props = {
  selectedKey: "2026-09-24",
  todayKey: "2026-09-25",
  entryDates: ["2026-09-21", "2026-09-24"],
};

const dayLinks = () =>
  screen.getAllByRole("link").map((a) => a.getAttribute("href"));

const dayLink = (key: string) =>
  screen.getAllByRole("link").find((a) => a.getAttribute("href") === `/?d=${key}`)!;

const hasEntryMark = (link: HTMLElement) =>
  link.querySelector(".bg-emerald-400") !== null;

describe("WeekStrip", () => {
  it("選択日を含む週（日曜始まり）の 7 日を、その日へのリンクとして表示する", () => {
    render(<WeekStrip {...props} />);

    expect(dayLinks()).toEqual([
      "/?d=2026-09-20",
      "/?d=2026-09-21",
      "/?d=2026-09-22",
      "/?d=2026-09-23",
      "/?d=2026-09-24",
      "/?d=2026-09-25",
      "/?d=2026-09-26",
    ]);
    expect(within(dayLink("2026-09-20")).getByText("日")).toBeInTheDocument();
    expect(within(dayLink("2026-09-20")).getByText("20")).toBeInTheDocument();
  });

  it("選択日を強調する", () => {
    render(<WeekStrip {...props} />);

    expect(dayLink("2026-09-24")).toHaveClass("bg-zinc-800");
    expect(dayLink("2026-09-23")).not.toHaveClass("bg-zinc-800");
  });

  it("今日の日付を太字にする", () => {
    render(<WeekStrip {...props} />);

    expect(within(dayLink("2026-09-25")).getByText("25")).toHaveClass("font-bold");
    expect(within(dayLink("2026-09-24")).getByText("24")).not.toHaveClass("font-bold");
  });

  it("記入済みの日に印を付ける", () => {
    render(<WeekStrip {...props} />);

    expect(hasEntryMark(dayLink("2026-09-21"))).toBe(true);
    expect(hasEntryMark(dayLink("2026-09-24"))).toBe(true);
    expect(hasEntryMark(dayLink("2026-09-22"))).toBe(false);
  });

  it("› で翌週、‹ で前週に切り替える", async () => {
    render(<WeekStrip {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "次の週" }));
    expect(dayLinks()[0]).toBe("/?d=2026-09-27");

    await userEvent.click(screen.getByRole("button", { name: "前の週" }));
    await userEvent.click(screen.getByRole("button", { name: "前の週" }));
    expect(dayLinks()[0]).toBe("/?d=2026-09-13");
  });

  it("日曜を選んでいても、ちょうど 1 週間ずつ送る", async () => {
    render(<WeekStrip {...props} selectedKey="2026-09-20" />);

    await userEvent.click(screen.getByRole("button", { name: "次の週" }));

    expect(dayLinks()[0]).toBe("/?d=2026-09-27");
  });

  it("左スワイプで翌週、右スワイプで前週に切り替える", () => {
    const { container } = render(<WeekStrip {...props} />);
    const strip = container.firstElementChild!;
    const swipe = (fromX: number, toX: number) => {
      fireEvent.touchStart(strip, { touches: [{ clientX: fromX }] });
      fireEvent.touchEnd(strip, { changedTouches: [{ clientX: toX }] });
    };

    swipe(200, 100);
    expect(dayLinks()[0]).toBe("/?d=2026-09-27");

    swipe(100, 200);
    swipe(100, 200);
    expect(dayLinks()[0]).toBe("/?d=2026-09-13");
  });

  it("40px 以下の短いスワイプは無視する", () => {
    const { container } = render(<WeekStrip {...props} />);
    const strip = container.firstElementChild!;

    fireEvent.touchStart(strip, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 160 }] });

    expect(dayLinks()[0]).toBe("/?d=2026-09-20");
  });

  it("選択日が変わったら、その日の週に戻る", async () => {
    const { rerender } = render(<WeekStrip {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "次の週" }));

    rerender(<WeekStrip {...props} selectedKey="2026-09-10" />);

    expect(dayLinks()[0]).toBe("/?d=2026-09-06");
  });
});
