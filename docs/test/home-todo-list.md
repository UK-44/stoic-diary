# Home（日記）画面 TDD TODO リスト

進め方は [idea-todo-list.md](idea-todo-list.md) と同じ（Red → Green → Refactor、実装済み部分は変異を入れて Red を確認）。

凡例: `[x]` 済 / `[ ]` 未着手 / `[-]` 見送り（理由を併記）

## 日付ユーティリティ（lib/date.ts）
- [x] todayKey は JST の日付を返す（UTC では前日の 23 時台でも JST の翌日になる）
- [x] isDateKey は YYYY-MM-DD だけを受け付ける
- [x] shiftDateKey は月・年をまたいで日付をずらせる
- [x] weekKeys は日曜始まりの 7 日を返す（日曜・土曜を指定しても同じ週）
- [x] weekdayJa / dayOfMonth は曜日と日を返す
- [x] monthStartKey / addMonths は月初を返す（年をまたぐ）
- [x] monthKeys は月の全日を返す（うるう年の 2 月は 29 日）
- [x] monthLabel は「YYYY年M月」を返す

## 値の型と変換（lib/diary/types.ts）
- [x] emptyValueFor は種類ごとの空の値を返す（ラベル付きはラベルごとに空文字）
- [x] normalizeValue: リッチテキストの旧形式（文字列配列）を箇条書き HTML に変換する（HTML はエスケープ）
- [x] normalizeValue: ラベル付きの旧形式（ラベル → 配列）を変換し、設定に無いラベルは捨てる
- [x] normalizeValue: チェックリストの壊れた要素を補正する
- [x] normalizeValue: 習慣は true の項目だけ残す
- [x] valueToPlainText: HTML のタグ・実体参照を除いたテキストにする
- [x] valueToPlainText: チェックリストは項目テキストを連結する
- [x] valueToPlainText: 習慣の値はテキストにしない
- [x] previewFromValues は最初の空でない値のテキストを返す

## フォーム解決（lib/diary/form-resolver.ts）
- [x] 項目を並び順どおりに返し、既存エントリの値を紐づける（無ければ null）
- [x] 固定メッセージは設定の文面を message に入れる
- [x] 習慣は「選択日より前にチェックした日数」を習慣ごとに数える
- [x] 習慣項目が無ければ過去の値を読みに行かない

## 保存（lib/diary/actions.ts）
- [x] 日付の形式が不正ならエラー
- [x] 総合評価が 1〜4 以外ならエラー（null は許可）
- [x] エントリと各項目の値を upsert し、画面を再検証する
- [x] DB エラー時は「保存に失敗しました」を返す

## 週ストリップ（components/diary/WeekStrip.tsx）
- [x] 選択日を含む週の 7 日を、その日へのリンクとして表示する
- [x] 記入済みの日に印を付ける
- [x] ‹ › で前後の週に切り替える
- [x] 左スワイプで翌週、右スワイプで前週に切り替える（短い移動は無視）

## 日記エディタ（components/diary/DiaryEditor.tsx）
- [x] 未記入の日は「日記を書く」を表示し、押すとフォームを開いてすぐ保存する
- [x] 記入済みの日は項目を並び順どおりに表示する
- [x] 総合評価を選ぶと 800ms 後に自動保存する（再度押すと解除）
- [x] 連続して変更したら最後の変更から 800ms 後に 1 回だけ保存する
- [x] 固定メッセージは保存対象に含めない
- [x] 保存状態（保存中… / 保存済み / 保存に失敗しました）を表示する
- [x] AI 振り返りボタンは現在の入力からプロンプトを作る

## 入力フィールド（components/diary/fields）
- [x] CheckboxList: Enter で項目を追加し、入力欄を空にする（空白だけなら追加しない）
- [x] CheckboxList: IME 変換中の Enter では追加しない
- [x] CheckboxList: チェック・編集・削除を通知する
- [x] HabitField: 習慣が無ければ設定への案内を表示する
- [x] HabitField: 残り日数 = 目標 − 過去の達成 − 当日チェック
- [x] HabitField: 残りが 0 なら「目標達成」を表示する
- [x] HabitField: チェックの切り替えを通知する
- [x] LabeledText: ラベルごとに入力欄を出し、変更したラベルだけ更新する
- [x] FixedMessage: 空の文面（空段落だけ）なら何も表示しない
- [x] FixedMessage: YouTube 埋め込みだけの文面は表示する
- [x] StaticRichText: 空行（空の段落 <p></p>）は <br> を入れて 1 行分の高さを持たせる（静的描画で空行が消えた不具合の再発防止）

## ページ（app/page.tsx, app/diary/[date]/page.tsx）
- [x] ?d= が無い・不正なら今日を表示する
- [x] ?d= の日付の見出し（M月D日 (曜)）を表示する
- [x] 長期目標があれば表示し、無ければ表示しない
- [x] 旧 URL /diary/YYYY-MM-DD は /?d=YYYY-MM-DD に転送し、不正な日付は / に転送する

## 共通ナビ（components/nav/AppNav.tsx）
- [x] 全メニューを表示する
- [x] 現在のページのメニューを強調する（Home は / のときだけ）

## 見送り
- [-] DiaryPane のスライド演出: 見た目だけで振る舞いが無い
- [-] WeekStrip の横スクロール（wheel）: jsdom で deltaX を安定して再現できないため
- [-] RichTextEditor の編集操作（Tab ネスト・バブルメニュー等）: jsdom は contenteditable の入力を再現できない。E2E で扱う

## 等価変異（テストを足さないもの）
- valueToPlainText の習慣判定 `every` → `some`: 実データではラベル付きは全部文字列、習慣は全部 boolean なので結果が変わらない
- FixedMessage の `data-youtube-video` 判定: TipTap の保存形式は必ず `<iframe` を含むため、`<iframe` 判定だけで同じ結果になる
- DiaryEditor の effect 内 `clearTimeout`: 直前の effect のクリーンアップでもタイマーが消えるため、外しても挙動が変わらない

## テスト中に気づいたこと（未対応・要判断）
- [ ] 総合評価のラベルが画面ごとに違う: Home と AI プロンプトは「悪い / 普通 / 良い / 最高」、Review は「悪い / 悪くない / 良い / 最高」。テストは現状の表示に合わせている
