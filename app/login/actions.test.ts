// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, redirect, revalidatePath } = vi.hoisted(() => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  // 本物の redirect() と同じく、呼ばれたら処理を打ち切る。
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { login, logout } from "./actions";

const form = (email: string, password: string) => {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login", () => {
  it("入力されたメールアドレスとパスワードでサインインし、/ へリダイレクトする", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });

    await expect(login(null, form("me@example.com", "secret"))).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "me@example.com",
      password: "secret",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("失敗したら固定のエラーメッセージを返す（Supabase の文言は出さない）", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });

    const state = await login(null, form("me@example.com", "wrong"));

    expect(state).toEqual({ error: "メールアドレスまたはパスワードが正しくありません" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("サインアウトして /login へリダイレクトする", async () => {
    auth.signOut.mockResolvedValue({});

    await expect(logout()).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(auth.signOut).toHaveBeenCalled();
  });
});
