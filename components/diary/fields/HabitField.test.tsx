import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitField } from "./HabitField";
import type { HabitProgress } from "@/lib/diary/types";

const habit = (overrides: Partial<HabitProgress> = {}): HabitProgress => ({
  id: "run",
  name: "ランニング",
  difficulty: "EASY",
  targetDays: 21,
  checkedBefore: 5,
  ...overrides,
});

const row = (name: string) => screen.getByText(name).closest("label")!;

describe("HabitField", () => {
  it("習慣が無ければ設定への案内を表示する", () => {
    render(<HabitField value={{}} habits={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/設定 → 日記の構成 から/)).toBeInTheDocument();
  });

  it("未チェックなら 残り = 目標 − 過去の達成日数", () => {
    render(<HabitField value={{}} habits={[habit()]} onChange={vi.fn()} />);

    expect(row("ランニング")).toHaveTextContent("残り 16 日");
  });

  it("当日チェック済みならさらに 1 日減る", () => {
    render(<HabitField value={{ run: true }} habits={[habit()]} onChange={vi.fn()} />);

    expect(row("ランニング")).toHaveTextContent("残り 15 日");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("残りが 0 になったら「目標達成」を表示する", () => {
    render(
      <HabitField value={{ run: true }} habits={[habit({ checkedBefore: 20 })]} onChange={vi.fn()} />,
    );

    expect(row("ランニング")).toHaveTextContent("目標達成 🎉");
    expect(row("ランニング")).not.toHaveTextContent("残り");
  });

  it("目標を超えても残りはマイナスにならない（目標達成のまま）", () => {
    render(<HabitField value={{}} habits={[habit({ checkedBefore: 30 })]} onChange={vi.fn()} />);

    expect(row("ランニング")).toHaveTextContent("目標達成 🎉");
  });

  it("習慣ごとに別々に計算する", () => {
    render(
      <HabitField
        value={{ read: true }}
        habits={[habit(), habit({ id: "read", name: "読書", targetDays: 90, checkedBefore: 0 })]}
        onChange={vi.fn()}
      />,
    );

    expect(row("ランニング")).toHaveTextContent("残り 16 日");
    expect(row("読書")).toHaveTextContent("残り 89 日");
  });

  it("チェックを入れると、その習慣を true にして通知する", async () => {
    const onChange = vi.fn();
    render(<HabitField value={{ read: true }} habits={[habit()]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith({ read: true, run: true });
  });

  it("チェックを外すと、その習慣を false にして通知する", async () => {
    const onChange = vi.fn();
    render(<HabitField value={{ run: true }} habits={[habit()]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith({ run: false });
  });
});
