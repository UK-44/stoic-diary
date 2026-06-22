-- チェックボックスリスト（ToDo 型）コンポーネント種類を追加する。
ALTER TYPE "ComponentType" ADD VALUE 'CHECKBOX_LIST';

-- コンポーネントの「非表示（アーカイブ）」を廃止し、不要な項目は削除で扱う。
-- archivedAt 列を撤去する（既存のアーカイブ済み項目は再び表示対象になる）。
ALTER TABLE "DiaryComponent" DROP COLUMN "archivedAt";
