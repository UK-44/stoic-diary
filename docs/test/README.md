# テスト

t-wada 流 TDD で書いたテストの TODO リストと進め方。

- [idea-todo-list.md](idea-todo-list.md) — Idea
- [home-todo-list.md](home-todo-list.md) — Home（日記）・日付・値の変換・共通ナビ
- [review-todo-list.md](review-todo-list.md) — Review・AI 振り返り
- [search-todo-list.md](search-todo-list.md) — Search
- [settings-todo-list.md](settings-todo-list.md) — Settings・Login

## 実行

```bash
npm test          # ウォッチ実行
npm run test:run  # 1 回だけ実行
```

## 進め方

1. 振る舞いを TODO リストに書き出す
2. 1 つ選んでテストを書き、失敗（Red）を確認する
3. 最小の実装で通す（Green）→ 重複を取り除く（Refactor）
4. 実装が先にある場合は、実装を一時的に壊して（変異を入れて）テストが失敗することを確認する。
   生き残った変異は、例を足す（三角測量）か、結果が変わらない「等価変異」として記録する

## テストダブルの方針

- DB（`@/lib/db`）・認証（`@/lib/auth`）・`next/cache`・`next/navigation` はモックに差し替える
- TipTap の `RichTextEditor` は jsdom で入力を再現できないため、[test/RichTextEditorStub.tsx](../../test/RichTextEditorStub.tsx) に差し替える
- 日付に依存するテストは `vi.useFakeTimers({ toFake: ["Date"] })` と `vi.setSystemTime` で今日を固定する
