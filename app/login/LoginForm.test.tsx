import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("./actions", () => ({ login }));

import { LoginForm } from "./LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("入力したメールアドレスとパスワードで login を呼ぶ", async () => {
    login.mockResolvedValue(null);
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("メールアドレス"), "me@example.com");
    await userEvent.type(screen.getByPlaceholderText("パスワード"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    const formData = login.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("me@example.com");
    expect(formData.get("password")).toBe("secret");
  });

  it("ログインに失敗したらエラーメッセージを表示する", async () => {
    login.mockResolvedValue({ error: "メールアドレスまたはパスワードが正しくありません" });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("メールアドレス"), "me@example.com");
    await userEvent.type(screen.getByPlaceholderText("パスワード"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeInTheDocument();
  });

  it("ログイン中はボタンを無効化し「ログイン中…」と表示する", async () => {
    login.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("メールアドレス"), "me@example.com");
    await userEvent.type(screen.getByPlaceholderText("パスワード"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("button", { name: "ログイン中…" })).toBeDisabled();
  });
});
