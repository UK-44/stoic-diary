# 02. ドメインモデル / データモデル

## 1. 中核となる考え方

日記エントリは「**不変のコア項目**」と「**可変のコンポーネント群**」に分かれる。

- コア項目: `目標`（テキスト）、`総合評価`（4 段階）— 常に存在する。
- コンポーネント群: 朝/夜の固定メッセージ、各種リスト等 — **どれを出すかは時期で変わる**。

この「どのコンポーネントをどの順で出すか」を、エントリ本体から切り離して
**フォーム構成マスタ（版管理つき）** で表現するのが設計の肝。

```
DiaryComponent (部品の定義: 何という項目で、どんな型か)
      │  多対多（順序つき・版ごと）
FormVersion ── FormVersionItem ──┘   (ある時期に有効なフォーム = 部品の並び)
      │ 適用
DiaryEntry ── DiaryEntryValue        (ある日の記録 = コア項目 + 各部品の入力値)
```

## 2. エンティティ定義

### User（利用者・認証）
- 自分専用だが将来拡張のため明示的に保持。エントリは `userId` で所有。
- 認証は Supabase Auth（メール認証）。`User.id` には Supabase の auth ユーザー UUID を採用し、
  初回アクセス時に `email` 付きで upsert する（別途 `Account` 等の連携テーブルは不要）。

### DiaryComponent（コンポーネントマスタ）
日記に差し込める「部品」の定義。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | String (cuid) | PK |
| key | String unique | 安定スラッグ（例: `today_thoughts`）。移行・参照に使う |
| name | String | 表示名（例: 「今日にかける想い」） |
| type | ComponentType | `FIXED_MESSAGE` / `BULLET_LIST` / `GROUPED_LIST` |
| config | Json | 型ごとの設定（下記） |
| archivedAt | DateTime? | アーカイブ日時（物理削除しない） |
| createdAt / updatedAt | DateTime | |

`config` の例:
- `FIXED_MESSAGE`: `{ "placeholder": null }`（本文テキストは版側で持つ＝時期で変えられる）
- `BULLET_LIST`: `{ "placeholder": "..." }`
- `GROUPED_LIST`: `{ "groups": ["Good", "Bad"] }`

### FormVersion（フォーム構成マスタ・版）
ある時期に有効な「フォームの並び」。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| name | String | 版の呼び名（例: 「2026年版」） |
| effectiveFrom | DateTime (date) | この日から有効 |
| note | String? | メモ |
| createdAt / updatedAt | DateTime | |

解決規則: 対象日付 `d` に対し、`effectiveFrom <= d` の中で `effectiveFrom` 最大の版を採用。

### FormVersionItem（版に属する部品の並び）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| formVersionId | String | 所属する版 |
| componentId | String | 参照するコンポーネント |
| order | Int | 表示順 |
| overrides | Json? | 版固有の上書き。`FIXED_MESSAGE` の本文 `{ "message": "Keep simple. 余白をつくる。" }` 等 |

- 一意制約: `(formVersionId, componentId)`。
- 固定メッセージの「内容」は `overrides.message` に持たせ、**時期ごとに違う文面**を出せるようにする。

### DiaryEntry（日記エントリ）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| userId | String | 所有者 |
| date | DateTime (date) | 日付（日単位）。`(userId, date)` で一意 |
| goal | String? | 目標 |
| rating | Int? | 総合評価（1〜4） |
| formVersionId | String? | 保存時に適用したフォーム版（スナップショット参照） |
| createdAt / updatedAt | DateTime | |

- 一意制約: `(userId, date)`。

### DiaryEntryValue（エントリ内の各部品の入力値）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| entryId | String | 所属エントリ |
| componentId | String | どの部品の値か |
| value | Json | 型に応じた値（下記） |

- 一意制約: `(entryId, componentId)`。
- `FIXED_MESSAGE` は表示専用のため値を保存しない（行を作らない）。
- `value` の形:
  - `BULLET_LIST`: `["項目1", "項目2", ...]`（string[]）
  - `GROUPED_LIST`: `{ "Good": ["..."], "Bad": ["..."] }`

## 3. enum

```
enum ComponentType {
  FIXED_MESSAGE   // 固定メッセージ表示（入力なし）
  BULLET_LIST     // 箇条書きリスト
  GROUPED_LIST    // グループ付き箇条書き（Good/Bad 等）
}
```

`総合評価` は当面 `Int(1..4)` とし、ラベルはアプリ定数で管理（OQ-3 で確定後に調整）。

## 4. Prisma スキーマ案

> 既定の `User` / `Post` サンプルは破棄して置き換える。`cuid()` を採用。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum ComponentType {
  FIXED_MESSAGE
  BULLET_LIST
  GROUPED_LIST
}

model User {
  id        String       @id // Supabase Auth のユーザー UUID を採用（自動採番しない）
  email     String       @unique
  name      String?
  image     String?
  entries   DiaryEntry[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model DiaryComponent {
  id         String            @id @default(cuid())
  key        String            @unique
  name       String
  type       ComponentType
  config     Json              @default("{}")
  archivedAt DateTime?
  items      FormVersionItem[]
  values     DiaryEntryValue[]
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
}

model FormVersion {
  id            String            @id @default(cuid())
  name          String
  effectiveFrom DateTime          @db.Date
  note          String?
  items         FormVersionItem[]
  entries       DiaryEntry[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@index([effectiveFrom])
}

model FormVersionItem {
  id            String         @id @default(cuid())
  formVersionId String
  componentId   String
  order         Int
  overrides     Json?
  formVersion   FormVersion    @relation(fields: [formVersionId], references: [id], onDelete: Cascade)
  component     DiaryComponent @relation(fields: [componentId], references: [id])

  @@unique([formVersionId, componentId])
  @@index([formVersionId, order])
}

model DiaryEntry {
  id            String            @id @default(cuid())
  userId        String
  date          DateTime          @db.Date
  goal          String?
  rating        Int?
  formVersionId String?
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  formVersion   FormVersion?      @relation(fields: [formVersionId], references: [id])
  values        DiaryEntryValue[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}

model DiaryEntryValue {
  id          String         @id @default(cuid())
  entryId     String
  componentId String
  value       Json
  entry       DiaryEntry     @relation(fields: [entryId], references: [id], onDelete: Cascade)
  component   DiaryComponent @relation(fields: [componentId], references: [id])

  @@unique([entryId, componentId])
}
```

> 注: Prisma 7 では generator の既定出力やクライアント生成方法が変わっている可能性があるため、
> 実装時に `node_modules` のドキュメント／生成物を確認して `generator` ブロックを最終化する。

## 5. 初期シードデータ（Notion 現行構成の再現）

現行の「Daily」を最初の `FormVersion`（例: effectiveFrom = 既存最古日 or プロジェクト開始日）として投入する。

| order | component.key | name | type | overrides / config |
| --- | --- | --- | --- | --- |
| 1 | `morning_message` | マイメッセージ（朝） | FIXED_MESSAGE | message: "Keep simple. 余白をつくる。" |
| 2 | `today_thoughts` | 今日にかける想い | BULLET_LIST | |
| 3 | `memo` | メモ | BULLET_LIST | |
| 4 | `good_bad_action` | 今日の Good/Bad Action | GROUPED_LIST | groups: ["Good", "Bad"] |
| 5 | `tomorrow_me` | 明日の俺へ | BULLET_LIST | |
| 6 | `night_message` | マイメッセージ（夜） | FIXED_MESSAGE | message: （末尾の歌詞テキスト） |

`目標` と `総合評価` はコア項目なのでコンポーネントには含めない。
