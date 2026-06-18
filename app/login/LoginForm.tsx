"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="メールアドレス"
        className={inputCls}
      />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="パスワード"
        className={inputCls}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
      >
        {pending ? "ログイン中…" : "ログイン"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

const inputCls =
  "rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500";
