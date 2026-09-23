import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("@/app/login/actions", () => ({ logout }));

import SettingsPage from "./page";

describe("Settings ページ", () => {
  it("アカウント情報・日記の構成へのリンクを表示する", async () => {
    render(await SettingsPage());

    expect(screen.getByRole("link", { name: /アカウント情報/ })).toHaveAttribute(
      "href",
      "/settings/account",
    );
    expect(screen.getByRole("link", { name: /日記の構成/ })).toHaveAttribute(
      "href",
      "/settings/diary",
    );
  });

  it("ログアウトボタンを表示する", async () => {
    render(await SettingsPage());

    expect(screen.getByRole("button", { name: "ログアウト" })).toHaveAttribute("type", "submit");
  });
});
