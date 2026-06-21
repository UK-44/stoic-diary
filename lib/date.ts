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

/** その日付を含む週（日曜始まり）の 7 日分の key を返す */
export function weekKeys(key: string): string[] {
  const d = dateKeyToUtcDate(key);
  const sunday = shiftDateKey(key, -d.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(sunday, i));
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** key の曜日（日本語 1 文字） */
export function weekdayJa(key: string): string {
  return WEEKDAY_JA[dateKeyToUtcDate(key).getUTCDay()];
}

/** key の「日」部分（1〜31） */
export function dayOfMonth(key: string): number {
  return dateKeyToUtcDate(key).getUTCDate();
}

/** その月の 1 日の key */
export function monthStartKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** key を n ヶ月ずらした、その月の 1 日の key */
export function addMonths(key: string, n: number): string {
  const d = dateKeyToUtcDate(monthStartKey(key));
  d.setUTCMonth(d.getUTCMonth() + n);
  return dateToKey(d);
}

/** その月の全日付 key（1 日〜末日） */
export function monthKeys(key: string): string[] {
  const start = dateKeyToUtcDate(monthStartKey(key));
  const month = start.getUTCMonth();
  const out: string[] = [];
  const d = new Date(start);
  while (d.getUTCMonth() === month) {
    out.push(dateToKey(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** key を「YYYY年M月」表記に */
export function monthLabel(key: string): string {
  const d = dateKeyToUtcDate(key);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
}
