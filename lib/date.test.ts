// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  dayOfMonth,
  isDateKey,
  monthKeys,
  monthLabel,
  monthStartKey,
  shiftDateKey,
  todayKey,
  weekdayJa,
  weekKeys,
} from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayKey", () => {
  it("JST の日付を返す（UTC では前日の 23 時台でも JST の翌日になる）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T15:30:00Z")); // JST 2026-09-24 00:30

    expect(todayKey()).toBe("2026-09-24");
  });

  it("JST の 23:59 まではその日のまま", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T14:59:00Z")); // JST 2026-09-24 23:59

    expect(todayKey()).toBe("2026-09-24");
  });
});

describe("isDateKey", () => {
  it.each(["2026-09-24", "1999-01-01"])("%s は日付 key", (v) => {
    expect(isDateKey(v)).toBe(true);
  });

  it.each(["2026-9-24", "2026/09/24", "2026-09-24x", "", "x2026-09-24"])(
    "%s は日付 key ではない",
    (v) => {
      expect(isDateKey(v)).toBe(false);
    },
  );
});

describe("shiftDateKey", () => {
  it.each([
    { key: "2026-09-24", days: 1, expected: "2026-09-25" },
    { key: "2026-09-30", days: 1, expected: "2026-10-01" },
    { key: "2026-01-01", days: -1, expected: "2025-12-31" },
    { key: "2026-09-24", days: -7, expected: "2026-09-17" },
  ])("$key を $days 日ずらすと $expected", ({ key, days, expected }) => {
    expect(shiftDateKey(key, days)).toBe(expected);
  });
});

describe("weekKeys", () => {
  const week = [
    "2026-09-20",
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
  ];

  it.each(["2026-09-20", "2026-09-24", "2026-09-26"])(
    "%s を含む週は日曜始まりの 7 日",
    (key) => {
      expect(weekKeys(key)).toEqual(week);
    },
  );
});

describe("weekdayJa / dayOfMonth", () => {
  it("曜日を日本語 1 文字で返す", () => {
    expect(weekdayJa("2026-09-20")).toBe("日");
    expect(weekdayJa("2026-09-24")).toBe("木");
  });

  it("日の部分を数値で返す", () => {
    expect(dayOfMonth("2026-09-04")).toBe(4);
  });
});

describe("monthStartKey / addMonths", () => {
  it("月初を返す", () => {
    expect(monthStartKey("2026-09-24")).toBe("2026-09-01");
  });

  it.each([
    { key: "2026-09-24", n: 1, expected: "2026-10-01" },
    { key: "2026-12-15", n: 1, expected: "2027-01-01" },
    { key: "2026-01-31", n: -1, expected: "2025-12-01" },
    { key: "2026-01-31", n: 1, expected: "2026-02-01" },
  ])("$key を $n ヶ月ずらすと $expected", ({ key, n, expected }) => {
    expect(addMonths(key, n)).toBe(expected);
  });
});

describe("monthKeys", () => {
  it("月の 1 日から末日までを返す", () => {
    const keys = monthKeys("2026-09-24");

    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-09-01");
    expect(keys.at(-1)).toBe("2026-09-30");
  });

  it.each([
    { key: "2026-10-10", days: 31 },
    { key: "2028-02-10", days: 29 },
    { key: "2026-02-10", days: 28 },
  ])("$key の月は $days 日", ({ key, days }) => {
    expect(monthKeys(key)).toHaveLength(days);
  });
});

describe("monthLabel", () => {
  it("「YYYY年M月」を返す", () => {
    expect(monthLabel("2026-09-01")).toBe("2026年9月");
  });
});
