import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン · Stoic Diary" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">ログイン</h1>
        <p className="text-sm text-zinc-400">Stoic Diary（オーナー専用）</p>
      </div>
      <LoginForm />
    </div>
  );
}
