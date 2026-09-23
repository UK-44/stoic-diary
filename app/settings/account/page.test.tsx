import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { user } = vi.hoisted(() => ({
  user: { current: {} as Record<string, unknown> },
}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => user.current) }));
vi.mock("@/components/settings/AccountSettings", () => ({
  AccountSettings: (props: object) => <pre data-testid="account-settings">{JSON.stringify(props)}</pre>,
}));

import AccountSettingsPage from "./page";

const props = () => JSON.parse(screen.getByTestId("account-settings").textContent!);

beforeEach(() => {
  user.current = { id: "user-1", email: "me@example.com", longTermGoal: null, longTermGoalDate: null };
});

describe("アカウント情報ページ", () => {
  it("メールアドレス・長期目標・対象日をフォームに渡す", async () => {
    user.current = {
      id: "user-1",
      email: "me@example.com",
      longTermGoal: "フルマラソン完走",
      longTermGoalDate: new Date("2027-03-01T00:00:00Z"),
    };

    render(await AccountSettingsPage());

    expect(props()).toEqual({
      email: "me@example.com",
      initialGoal: "フルマラソン完走",
      initialGoalDate: "2027-03-01",
    });
  });

  it("長期目標・対象日が未設定なら空文字を渡す", async () => {
    render(await AccountSettingsPage());

    expect(props()).toMatchObject({ initialGoal: "", initialGoalDate: "" });
  });
});
