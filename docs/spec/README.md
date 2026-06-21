# Stoic Diary — 仕様書（仕様駆動開発）

Notion で運用していた日記「Daily」を、自前の Web アプリへ移行するためのプロジェクト仕様。
仕様駆動開発（Spec-Driven Development）で進める。**まず仕様 → 承認 → 実装** の順を守る。

## ドキュメント構成

| ファイル | 内容 |
| --- | --- |
| [01-requirements.md](./01-requirements.md) | 背景・ゴール・利用者・スコープ・ユーザーストーリー・機能/非機能要件 |
| [02-domain-model.md](./02-domain-model.md) | ドメインモデル・データモデル（Prisma スキーマ案）・コンポーネントマスタ設計 |
| [03-architecture.md](./03-architecture.md) | 技術スタック・画面構成・認証・Notion 移行方式・ディレクトリ構成 |
| [04-implementation-plan.md](./04-implementation-plan.md) | マイルストーン・タスク分解・受け入れ基準 |

## 進め方のルール

- 仕様に変更が必要なら、コードより先にこのドキュメントを更新する。
- 実装着手前に必ず該当の Next.js ガイド（`node_modules/next/dist/docs/`）を読む。
  本リポジトリの Next.js（16.2.7）は破壊的変更を含み、学習データと API が異なる可能性があるため。
- 1 マイルストーンごとに動作確認し、受け入れ基準を満たしてから次へ進む。

## 現状サマリ（2026-06-19 時点）

- `create-next-app` 直後。Next 16.2.7 / React 19.2.4 / Prisma 7.8 / Tailwind 4。
- DB は Supabase の PostgreSQL（`.env` に `DATABASE_URL` / `DIRECT_URL` 設定済み）。
- Prisma スキーマは既定サンプル（`User` / `Post`）のまま。本プロジェクトで置き換える。
