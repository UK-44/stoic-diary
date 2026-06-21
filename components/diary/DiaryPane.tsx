"use client";

import { useEffect, useRef } from "react";

/**
 * 日記本体のラッパ。日付が変わったとき、選択日が現在より新しいか古いかに応じて
 * 新しい内容を左右からスライドインさせ、読み込み待ちの体感を和らげる。
 */
export function DiaryPane({
  dateKey,
  children,
}: {
  dateKey: string;
  children: React.ReactNode;
}) {
  const prev = useRef(dateKey);

  // この描画時点での方向（prev はまだ更新前なので比較できる）。
  let cls = "";
  if (prev.current !== dateKey) {
    cls = dateKey > prev.current ? "slide-in-right" : "slide-in-left";
  }

  useEffect(() => {
    prev.current = dateKey;
  }, [dateKey]);

  return (
    <div key={dateKey} className={cls}>
      {children}
    </div>
  );
}
