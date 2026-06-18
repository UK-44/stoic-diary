// 日付ユーティリティ。日記は日単位（JST）で扱う。

const TZ = "Asia/Tokyo";

/** JST の「今日」を YYYY-MM-DD で返す */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD 文字列かどうか */
export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** YYYY-MM-DD を、その日の UTC 0 時 Date に変換（@db.Date 保存用） */
export function dateKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** @db.Date の Date を YYYY-MM-DD 文字列へ */
export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** key から n 日ずらした key を返す */
export function shiftDateKey(key: string, days: number): string {
  const d = dateKeyToUtcDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToKey(d);
}
