"use client";

type Props = {
  value: number; // 0..5
  onChange?: (next: number) => void;
  readOnly?: boolean;
};

/** 1〜5 の星評価。クリックで設定、同じ星を再クリックで 0 に戻す。 */
export function StarRating({ value, onChange, readOnly }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className={`text-lg leading-none ${readOnly ? "cursor-default" : "cursor-pointer"} ${
            n <= value ? "text-amber-400" : "text-zinc-700"
          }`}
          aria-label={`${n} つ星`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
