# 既存コードに 300 本のテストを書いて学んだ「テストのテストの仕方」— t-wada 流 TDD をテスト初心者向けに解説

## はじめに

個人で作っている日記アプリ（Next.js + Prisma）には、ずっとテストがありませんでした。今回、画面ごとにテストを書き足し、最終的に **34 ファイル・306 本** になりました。

テストを書く方針には、**t-wada さん（和田卓人さん）が広めたテスト駆動開発（TDD）の考え方**を使いました。この記事では、そのとき使った考え方を、テストを書いたことがあまりない人向けに実際のコードで説明します。

この記事でわかること:

- TDD の基本サイクル（Red → Green → Refactor）と TODO リスト
- **実装が先にあるコード**に後からテストを書くとき、テストが本当に役立つか確かめる方法
- 三角測量、テストダブル、Testing Library の考え方

:::note info
使った道具: Vitest / React Testing Library / user-event / jsdom。Next.js 公式ドキュメントの Vitest セットアップ手順どおりに入れています。
:::

---

## 1. TDD とは何か

TDD（テスト駆動開発）は、**テストを先に書き、それを通すように実装を書く**開発のやり方です。Kent Beck の『テスト駆動開発』（和田卓人 訳、オーム社）で広く知られるようになりました。

基本は次の 3 ステップの繰り返しです。

| ステップ | やること |
|---|---|
| 🔴 Red | まだ通らないテストを 1 本書き、**失敗することを確認する** |
| 🟢 Green | そのテストが通る最小限のコードを書く |
| 🔵 Refactor | テストが通ったまま、重複をなくし読みやすくする |

大事なのは **「小さく 1 本ずつ」** 進めることです。一度に 10 本書いて 10 か所直すのではなく、1 本書いて通すことを繰り返します。

### TODO リストから始める

いきなりテストコードは書きません。最初に **「このコードがどう振る舞うべきか」を箇条書きにした TODO リスト**を作ります。

実際に書いた TODO リストの一部です（Idea 画面のサーバー処理）。

```markdown:docs/test/idea-todo-list.md
### createIdea
- [ ] 見出しが空白のみならエラーを返し、保存しない
- [ ] 見出しは前後の空白を除いて保存する
- [ ] メモが空白のみなら null で保存する
- [ ] 評価は 0〜5 に丸める（-1→0 / 6→5 / 3.6→4 / NaN→0）
- [ ] 成功時は作成 id を返し、一覧を再検証する
```

ポイントは次の 3 つです。

- **実装の手順ではなく「振る舞い」を書く**（「trim を呼ぶ」ではなく「前後の空白を除いて保存する」）
- 作業中に思いついたことはリストに追記し、**今のテストに集中する**
- 終わったら `[x]` を付ける。テストが通ったかどうかが、進み具合をそのまま表す

---

## 2. 後からテストを書くときの落とし穴：「テストが最初から通ってしまう」

今回は実装がもう動いていました。そのため、テストを書くと **最初から Green（成功）** になります。

一見よさそうですが、ここに落とし穴があります。

> **一度も失敗したことのないテストは、壊れたときに本当に失敗してくれるかわからない。**

たとえば次のテストは、どんな実装でも通ってしまいます。

```ts
it("評価を丸める", async () => {
  await createIdea({ title: "x", content: "", rating: 3.6, label: null });
  expect(prisma.idea.create).toHaveBeenCalled(); // 呼ばれたことしか見ていない
});
```

TDD で「まず Red を確認する」のは、**テストが正しく失敗できること（テスト自体が正しいこと）を確かめるため**です。後からテストを書くときもこれを飛ばさないために、次の方法を使いました。

### 実装をわざと壊して、テストが失敗するか見る（ミューテーションテスト）

1. テストを書く（Green になる）
2. **実装を一時的に書き換えて壊す**（例: `Math.round(n)` を `n` にする）
3. テストを実行し、**失敗することを確認する**
4. 実装を元に戻す

この「わざと入れたバグ」を **変異（ミュータント）** と呼びます。テストが失敗すれば変異を「倒した（Killed）」、失敗しなければ変異が「生き残った（Survived）」と言います。

:::note info
これを自動でやるツールもあります（JavaScript なら Stryker など）。今回は仕組みの理解を優先し、置換文字列を指定して手で回しました。
:::

簡単なシェルスクリプトを用意し、置換を 1 つずつ当ててはテストを流しました。

```bash:mutate.sh（抜粋）
for m in "$@"; do
  cp "$f" "$bak"
  perl -0pi -e "$m" "$f"          # 実装を壊す
  out=$(npx vitest run "$t" 2>&1) # テストを流す
  cp "$bak" "$f"                  # 元に戻す
  if echo "$out" | grep -qE "Tests .*failed"; then
    echo "KILLED  : $m"
  else
    echo "SURVIVED: $m"           # テストが見逃した！
  fi
done
```

実行結果の例です。

```text
KILLED  : s/Math.round\(n\)/n/
               × 3.6 → 4
KILLED  : s/if \(!Number.isFinite\(n\)\) return 0;//
               × NaN → 0
SURVIVED: s/while \(d.getUTCMonth\(\) === month\)/while (... && out.length < 30)/
```

`SURVIVED` が出たら、**テストが見逃している振る舞いがある**ということです。全体で約 190 個の変異を入れ、最初の時点で 16 個が生き残りました。生き残った変異への対処は次の章で説明します。

---

## 3. 三角測量：例を 1 つ足して、見逃しをなくす

生き残った変異の多くは、**テストの例が 1 つしかない**ことが原因でした。

### 例 1: 月の日数

「その月の全日付を返す」関数 `monthKeys` のテストは、最初こう書いていました。

```ts
it("月の 1 日から末日までを返す", () => {
  expect(monthKeys("2026-09-24")).toHaveLength(30); // 9 月は 30 日
});
```

ここに「30 日で打ち切る」という変異を入れても、9 月は 30 日なのでテストは通ってしまいます。

そこで **別の角度から例を足します**。これを **三角測量（Triangulation）** と呼びます。1 点だけでは位置が決まらないので、複数の点から測って位置を割り出す、というたとえです。

```ts
it.each([
  { key: "2026-10-10", days: 31 }, // ← 追加：31 日の月
  { key: "2028-02-10", days: 29 }, // うるう年
  { key: "2026-02-10", days: 28 },
])("$key の月は $days 日", ({ key, days }) => {
  expect(monthKeys(key)).toHaveLength(days);
});
```

31 日の月を 1 つ足しただけで、変異は倒せました。

### 例 2: チェックボックスの切り替え

```ts
it("チェックを切り替えると、その項目だけ反転して通知する", async () => {
  // 未チェック → チェック の向きしか試していない
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(onChange).toHaveBeenCalledWith([{ text: "買い物", checked: true }, ...]);
});
```

実装の `checked: !it.checked` を `checked: true` に壊しても通ってしまいました。**チェックを外す方向**のテストを足して解決です。

```ts
it("チェック済みの項目を押すとチェックを外す", async () => {
  await userEvent.click(screen.getAllByRole("checkbox")[1]);
  expect(onChange).toHaveBeenCalledWith([
    { text: "買い物", checked: false },
    { text: "掃除", checked: false },
  ]);
});
```

:::note warn
**先頭の要素だけ・片方向だけ・1 つの値だけ**のテストは見逃しが起きやすいです。「2 番目を消す」「逆向きに切り替える」「境界値（0・最大・月末）」を足すと、見逃しを大きく減らせます。
:::

### 等価変異：足さなくていいケース

生き残った 16 個のうち 4 個は、**実装を変えても実際の結果が変わらない変異**でした。これを **等価変異** と呼びます。

たとえば、評価（1〜4 の整数）の表示条件 `rating != null` を `rating &&` に変えても、評価が 0 になることはないので結果は同じです。等価変異を倒そうとして不自然なテストを書く必要はありません。**なぜ等価なのかを記録しておけば十分**です。

---

## 4. テストダブル：本物の代わりを使う

画面のテストでは、データベース・認証・ページ遷移などを本物のまま使うと、テストが遅く不安定になります。そこで **テストダブル**（本物の代わりに使う偽物）を使います。映画のスタントダブルと同じ発想です。

Vitest では `vi.mock` で差し替えます。

```ts:lib/idea/actions.test.ts
const { prisma } = vi.hoisted(() => ({
  prisma: { idea: { create: vi.fn(), findFirst: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ prisma }));                    // DB の代わり
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),      // ログイン済みユーザーの代わり
}));

it("ログイン中ユーザーのアイデアとして保存する", async () => {
  await createIdea(input());

  expect(prisma.idea.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId: "user-1" }),
  });
});
```

### 差し替える範囲の判断

「何でもモックにする」と、何もテストしていないのと同じになってしまいます。今回は次の基準にしました。

| 差し替えたもの | 理由 |
|---|---|
| DB（Prisma）・認証・`next/navigation` | 外部とのやり取りで、テストを遅く不安定にする |
| リッチテキストエディタ（TipTap） | テスト環境（jsdom）では編集操作を再現できない |
| **自分のロジック（日付計算・値の変換など）** | **差し替えない**。ここがテストしたい本体 |

リッチテキストエディタは、値の受け渡しだけを再現する **スタブ** を共通部品にしました。

```tsx:test/RichTextEditorStub.tsx
// jsdom では contenteditable の入力を再現できないため、
// 値の受け渡しだけをテキストエリアで再現する。
export function RichTextEditor({ value, placeholder, onChange }: Props) {
  return (
    <textarea
      aria-label={placeholder ?? "Write"}
      defaultValue={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
```

```ts
vi.mock("@/components/diary/fields/RichTextEditor", () => import("@/test/RichTextEditorStub"));
```

エディタ本体の編集操作（Tab でリストをネストする等）は、ブラウザで動かす E2E テストの担当として、TODO リストに「見送り」と理由を書いておきました。

---

## 5. Testing Library：ユーザーと同じ操作でテストする

React コンポーネントのテストには React Testing Library を使いました。このライブラリには次の方針があります。

> The more your tests resemble the way your software is used, the more confidence they can give you.
> （テストがソフトウェアの実際の使われ方に近いほど、テストから得られる安心は大きくなる）

具体的には、**CSS クラスや内部の state ではなく、ユーザーに見えるもの**で要素を探します。

```tsx:components/idea/StarRating.test.tsx
const star = (n: number) => screen.getByRole("button", { name: `${n} つ星` });

it("現在値と同じ星を押すと 0（未評価）を通知する", async () => {
  const onChange = vi.fn();
  render(<StarRating value={2} onChange={onChange} />);

  await userEvent.click(star(2));

  expect(onChange).toHaveBeenCalledWith(0);
});
```

- `getByRole("button", { name: ... })` で「〇〇という名前のボタン」を探す
- `userEvent.click` で、実際のクリックに近い操作をする
- 検証するのは **結果（通知された値）** で、内部の state は見ない

こう書いておくと、見た目を変える、state の持ち方を変える、といったリファクタリングをしてもテストが壊れにくくなります。

:::note warn
点灯中の星の色など、**見た目そのものが仕様**の部分だけは、CSS クラス（`toHaveClass("text-amber-400")`）で確かめています。ここはデザインを変えるとテストも直す必要がある、と割り切っています。
:::

---

## 6. 読みやすいテストの書き方

### テスト名は日本語の「仕様」にする

```ts
it("見出しが空白のみならエラーを返し、保存しない", ...)
it("40px 以下の短いスワイプは無視する", ...)
it("日曜を選んでいても、ちょうど 1 週間ずつ送る", ...)
```

テスト名を並べると、**そのまま仕様書として読めます**。失敗したときも、何が壊れたのかがすぐわかります。

### 準備・実行・確認の 3 段に分ける（AAA）

```ts
it("保存に失敗したらエラーメッセージを表示し、再描画しない", async () => {
  // Arrange（準備）
  actions.updateIdea.mockResolvedValue({ ok: false, error: "対象が見つかりません" });
  render(<IdeaForm initial={existing} />);

  // Act（実行）
  await userEvent.click(screen.getByRole("button", { name: "保存" }));

  // Assert（確認）
  expect(await screen.findByText("対象が見つかりません")).toBeInTheDocument();
  expect(router.refresh).not.toHaveBeenCalled();
});
```

実際のコードではコメントは書かず、**空行で 3 段に区切って**います。どこが準備でどこが確認かが一目でわかります。

### 時間はテスト側で操作する

「800ms 入力がなければ自動保存」「今日の日付を表示」のように時間に依存するコードは、**フェイクタイマー**で時間をテスト側から操作します。

```ts:components/diary/DiaryEditor.test.tsx
beforeEach(() => {
  vi.useFakeTimers();
});

it("総合評価を選ぶと 800ms 後に自動保存する", async () => {
  renderEditor();

  fireEvent.click(screen.getByRole("button", { name: "良い" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(799); });
  expect(saveDiaryEntry).not.toHaveBeenCalled();   // 799ms ではまだ保存しない

  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(saveDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({ rating: 3 }));
});
```

799ms と 800ms の **境界** を両方確かめているのもポイントです。「今日」も `vi.setSystemTime(...)` で固定するので、テストを実行する日によって結果が変わることもありません。

---

## 7. テストを書いて見つかったもの

テストを書く過程で、**既存コードの不具合や仕様のずれ**がいくつか見つかりました。

- **検索で古い日記がヒットしない**: 新しい順に 200 件を取ってからキーワードで絞っていたため、201 件目より古い日記は検索に出ない
- **評価の呼び方が画面ごとに違う**: ある画面では「普通」、別の画面では「悪くない」
- **追加に失敗しても入力が消える**: 結果を待たずに入力欄を空にしていた

どれもテストを書こうとして「この場合はどうなるべき？」と考えたときに気づいたものです。**TODO リストを書くこと自体が、仕様を見直すきっかけ**になります。

これらを直すときは、TDD どおり **「正しい挙動を表す、失敗するテスト」を先に書いてから**修正する予定です。

---

## まとめ

| 考え方 | 一言でいうと |
|---|---|
| TODO リスト | 実装の手順ではなく「振る舞い」を先に書き出す |
| Red → Green → Refactor | 1 本ずつ、失敗を確認してから通す |
| テストのテスト（ミューテーション） | 実装をわざと壊して、テストが失敗するか確かめる |
| 三角測量 | 例が 1 つだと見逃す。逆方向・2 番目・境界値を足す |
| 等価変異 | 結果が変わらない変異は、理由を記録して見送る |
| テストダブル | 外部とのやり取りだけ差し替え、自分のロジックは本物でテストする |
| Testing Library | ユーザーに見えるもので探し、結果を確かめる |

特に初心者の方に伝えたいのは次の 1 点です。

> **テストが通ったら、一度わざと壊してみる。**

これだけで「なんとなく通っているテスト」が「頼れるテスト」に変わります。

## 参考

- Kent Beck 著、和田卓人 訳『テスト駆動開発』（オーム社）
- [Next.js: How to set up Vitest with Next.js](https://nextjs.org/docs/app/guides/testing/vitest)
- [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Vitest: Mocking](https://vitest.dev/guide/mocking)
- [Stryker Mutator](https://stryker-mutator.io/)
