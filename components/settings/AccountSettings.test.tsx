import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { saveLongTermGoal, router } = vi.hoisted(() => ({
  saveLongTermGoal: vi.fn(),
  router: { refresh: vi.fn() },
}));
vi.mock("@/lib/settings/actions", () => ({ saveLongTermGoal }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { AccountSettings } from "./AccountSettings";

const goalInput = () => screen.getByPlaceholderText(/長い目で目指したいこと/);
const dateInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[type="date"]')!;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountSettings", () => {
  it("メールアドレスと現在の長期目標・対象日を表示する", () => {
    const { container } = render(
      <AccountSettings email="me@example.com" initialGoal="完走" initialGoalDate="2027-03-01" />,
    );

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(goalInput()).toHaveValue("完走");
    expect(dateInput(container)).toHaveValue("2027-03-01");
  });

  it("保存すると入力した長期目標と対象日で saveLongTermGoal を呼び、再描画する", async () => {
    saveLongTermGoal.mockResolvedValue({ ok: true });
    const { container } = render(
      <AccountSettings email="me@example.com" initialGoal="" initialGoalDate="" />,
    );

    await userEvent.type(goalInput(), "フルマラソン完走");
    fireEvent.change(dateInput(container), { target: { value: "2027-03-01" } });
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(saveLongTermGoal).toHaveBeenCalledWith("フルマラソン完走", "2027-03-01");
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("保存に失敗したらエラーを表示し、再描画しない", async () => {
    saveLongTermGoal.mockResolvedValue({ ok: false, error: "保存できませんでした" });
    render(<AccountSettings email="me@example.com" initialGoal="完走" initialGoalDate="" />);

    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("保存できませんでした")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
