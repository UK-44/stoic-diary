# 03. アーキテクチャ / 技術設計

## 1. 技術スタック

| 領域 | 採用 | 備考 |
| --- | --- | --- |
| フレームワーク | Next.js 16.2.7（App Router） | **実装前に `node_modules/next/dist/docs/` を読む**（破壊的変更あり） |
| UI | React 19.2 + Tailwind CSS 4 | ダークモード基調・余白多め |
| DB | PostgreSQL（Supabase） | `.env` 設定済み（pooler + direct） |
| ORM | Prisma 7.8 | `DATABASE_URL`（pooler）/ `DIRECT_URL`（migration） |
| 認証 | Supabase Auth（メール認証） | `@supabase/supabase-js` + `@supabase/ssr`。決定済み（OQ-1） |

## 2. 認証方式（Supabase Auth・確定）

- **Supabase Auth のメール認証**を採用（既に Supabase を利用中で統合が自然）。
  - メール＋パスワードでサインイン（必要なら将来マジックリンクへ拡張可）。
  - サインアップは塞ぎ、オーナー 1 アカウントのみを Supabase 側で発行・運用する。
- Next.js との連携は `@supabase/ssr` を使い、Cookie ベースでセッションを管理。
  - `lib/supabase/server.ts`（Server Component / Server Action 用）と
    `lib/supabase/client.ts`（Client Component 用）を用意。
- middleware でセッションを更新しつつ、未認証は `/login` へリダイレクト（`/login` と認証コールバックを除く全ルート保護）。
- アプリの所有者判定: Supabase の認証ユーザー（`auth.users` の UUID）を正とする。
  - Prisma の `User.id` に Supabase の auth UID（UUID 文字列）を採用し、初回アクセス時に
    `email` 付きで upsert。エントリは常にこの `userId` に紐づく（多層防御、NFR-1）。

## 3. 画面構成

| パス | 役割 | 主な操作 |
| --- | --- | --- |
| `/login` | サインイン | OAuth ログイン |
| `/` | ダッシュボード/一覧 | エントリ一覧（新しい順）・今日へ移動 |
| `/diary/[date]` | 1 日の日記 | コア項目＋動的フォームの表示・編集・保存 |
| `/admin/components` | コンポーネントマスタ | 部品の追加・編集・アーカイブ |
| `/admin/forms` | フォーム構成マスタ | 版の作成、部品の並び・固定メッセージ文面の設定 |

`date` は `YYYY-MM-DD`。存在しなければ「未記入の新規エントリ」として動的フォームを描画し、保存時に upsert。

## 4. データアクセス方針

- **読み取り**: Server Component で Prisma を直接呼ぶ。
- **書き込み**: Server Actions を基本とする（フォーム送信）。Next 16 の Server Actions 仕様は
  実装前にドキュメントで確認する。
- Prisma クライアントはシングルトン（`lib/db.ts`）で共有し、開発時のコネクション枯渇を防ぐ。
- すべての書き込み/読み取りでオーナー所有チェックを通す（`lib/auth.ts` のヘルパ経由）。

## 5. 動的フォームの仕組み（中核）

1. 対象日付 `d` に対し有効な `FormVersion` を解決（`effectiveFrom <= d` の最新）。
2. その `FormVersionItem`（order 昇順）と各 `DiaryComponent.type` から、描画する入力 UI を決定。
   - `FIXED_MESSAGE` → `overrides.message` を読み取り専用カードで表示（入力なし）。
   - `BULLET_LIST` → 追加/削除できる行リスト入力。
   - `GROUPED_LIST` → `config.groups` ごとに行リスト入力。
3. 既存エントリがあれば `DiaryEntryValue` を component 単位でマージして初期値に。
4. 保存時: `DiaryEntry` を `(userId, date)` で upsert し、`formVersionId` に適用版を記録。
   値は component 単位で upsert（`FIXED_MESSAGE` は保存しない）。
5. 閲覧（過去日）: エントリに記録された `formVersionId` を優先採用し、**当時の構成**で表示（FR-8）。

コンポーネント型の描画は `components/diary/fields/` 配下に型ごとのコンポーネントを置き、
`type` でディスパッチする（レジストリ方式）。新しい型の追加はここに足すだけ、を目指す。

## 6. Notion 移行方式（OQ-2）

- 入力: Notion の **「Markdown & CSV」エクスポート** 一式。
  - CSV: 各 Daily の `Date` / `目標` / `総合評価` プロパティ。
  - 各ページの `.md`: 本文セクション（見出し→コンポーネント）。
- スクリプト `scripts/import-notion.ts`（`tsx` 等で実行）:
  1. CSV を行ごとに読み、`date` をキーに `DiaryEntry` を upsert（`goal` / `rating` をマップ）。
  2. 対応 `.md` を見出し単位でパースし、`DiaryComponent.key` にマッピングして
     `BULLET_LIST` / `GROUPED_LIST` の値に変換、`DiaryEntryValue` を upsert。
  3. 冪等（再実行で重複しない。`(userId,date)` と `(entryId,componentId)` の一意制約で担保）。
- 見出し名 → component.key の対応表はスクリプト内に定義（02 のシード表に準拠）。
- `総合評価` の文字列→数値マップは OQ-3 確定後に定義。

## 7. ディレクトリ構成（案）

```
app/
  login/page.tsx
  page.tsx                     # 一覧
  diary/[date]/page.tsx        # 日記の表示・編集
  admin/components/page.tsx
  admin/forms/page.tsx
  auth/callback/route.ts       # Supabase 認証コールバック
lib/supabase/server.ts         # Server 用 Supabase クライアント
lib/supabase/client.ts         # Client 用 Supabase クライアント
middleware.ts                  # セッション更新＋未認証リダイレクト
components/
  diary/DiaryForm.tsx
  diary/fields/FixedMessage.tsx
  diary/fields/BulletList.tsx
  diary/fields/GroupedList.tsx
lib/
  db.ts                        # Prisma シングルトン
  auth.ts                      # セッション/所有者チェック
  form-resolver.ts             # 日付→有効FormVersion 解決
  actions/                     # Server Actions
prisma/
  schema.prisma
  seed.ts                      # 初期 FormVersion / コンポーネント
scripts/
  import-notion.ts             # 移行スクリプト
```

## 8. 環境変数

| 変数 | 用途 | 状態 |
| --- | --- | --- |
| `DATABASE_URL` | Prisma 実行時（pooler） | 設定済み |
| `DIRECT_URL` | マイグレーション（direct） | 設定済み |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | 追加予定 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー（クライアント） | 追加予定 |

> `.env` に DB 認証情報が平文で入っている。`.gitignore` 済みであることを確認し、漏洩に注意。
