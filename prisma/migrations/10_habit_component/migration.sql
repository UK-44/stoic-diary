-- 習慣トラッカー（目標日数までチェックを積み上げる）コンポーネント種類を追加する。
-- config に難易度（EASY=21 / NORMAL=66 / HARD=90 日）を保持し、日次の値は { checked } のみ。
ALTER TYPE "ComponentType" ADD VALUE 'HABIT';
