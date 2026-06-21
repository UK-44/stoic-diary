-- コンポーネント型を実態に合わせて改名する。
-- BULLET_LIST → RICH_TEXT（Notion 風リッチテキスト）
-- GROUPED_LIST → LABELED_TEXT（ラベルに 1:1 で紐づくフィールド群。例: Good/Bad）
-- RENAME は既存行の値も自動的に更新される。
ALTER TYPE "ComponentType" RENAME VALUE 'BULLET_LIST' TO 'RICH_TEXT';
ALTER TYPE "ComponentType" RENAME VALUE 'GROUPED_LIST' TO 'LABELED_TEXT';
