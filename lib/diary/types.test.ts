// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emptyValueFor, normalizeValue, previewFromValues, valueToPlainText } from "./types";

describe("emptyValueFor", () => {
  it.each([
    { type: "RICH_TEXT", expected: "" },
    { type: "CHECKBOX_LIST", expected: [] },
    { type: "HABIT", expected: {} },
    { type: "FIXED_MESSAGE", expected: null },
  ] as const)("$type の空の値は $expected", ({ type, expected }) => {
    expect(emptyValueFor(type, {})).toEqual(expected);
  });

  it("ラベル付きはラベルごとに空文字を持つ", () => {
    expect(emptyValueFor("LABELED_TEXT", { groups: ["Good", "Bad"] })).toEqual({
      Good: "",
      Bad: "",
    });
  });
});

describe("normalizeValue", () => {
  describe("RICH_TEXT", () => {
    it("HTML 文字列はそのまま返す", () => {
      expect(normalizeValue("RICH_TEXT", "<p>本文</p>", {})).toBe("<p>本文</p>");
    });

    it("旧形式（文字列配列）は空要素を除いて箇条書き HTML にする", () => {
      expect(normalizeValue("RICH_TEXT", ["走る", " ", "読む"], {})).toBe(
        "<ul><li><p>走る</p></li><li><p>読む</p></li></ul>",
      );
    });

    it("旧形式の文字列は HTML エスケープする", () => {
      expect(normalizeValue("RICH_TEXT", ["a<b> & c"], {})).toBe(
        "<ul><li><p>a&lt;b&gt; &amp; c</p></li></ul>",
      );
    });

    it("旧形式が全部空なら空文字", () => {
      expect(normalizeValue("RICH_TEXT", ["", "  "], {})).toBe("");
    });

    it("想定外の値は空文字", () => {
      expect(normalizeValue("RICH_TEXT", 123, {})).toBe("");
    });
  });

  describe("LABELED_TEXT", () => {
    const config = { groups: ["Good", "Bad"] };

    it("設定のラベルごとに値を取り出し、無いラベルは空文字にする", () => {
      expect(normalizeValue("LABELED_TEXT", { Good: "<p>早起き</p>" }, config)).toEqual({
        Good: "<p>早起き</p>",
        Bad: "",
      });
    });

    it("旧形式（ラベル → 配列）は箇条書き HTML にする", () => {
      expect(normalizeValue("LABELED_TEXT", { Good: ["早起き"] }, config)).toEqual({
        Good: "<ul><li><p>早起き</p></li></ul>",
        Bad: "",
      });
    });

    it("設定に無いラベルの値は捨てる", () => {
      expect(normalizeValue("LABELED_TEXT", { Old: "<p>x</p>" }, config)).toEqual({
        Good: "",
        Bad: "",
      });
    });
  });

  describe("CHECKBOX_LIST", () => {
    it("壊れた要素を除き、text と checked を補正する", () => {
      expect(
        normalizeValue(
          "CHECKBOX_LIST",
          [{ text: "買い物", checked: true }, null, "x", { text: 1, checked: "yes" }],
          {},
        ),
      ).toEqual([
        { text: "買い物", checked: true },
        { text: "", checked: false },
      ]);
    });

    it("配列でなければ空配列", () => {
      expect(normalizeValue("CHECKBOX_LIST", { text: "x" }, {})).toEqual([]);
    });
  });

  describe("HABIT", () => {
    it("true の習慣だけを残す", () => {
      expect(normalizeValue("HABIT", { a: true, b: false, c: "true" }, { habits: [] })).toEqual({
        a: true,
      });
    });

    it("配列は空のオブジェクトにする", () => {
      expect(normalizeValue("HABIT", [true], { habits: [] })).toEqual({});
    });
  });

  it("FIXED_MESSAGE は値を持たない", () => {
    expect(normalizeValue("FIXED_MESSAGE", "x", {})).toBeNull();
  });
});

describe("valueToPlainText", () => {
  it("HTML のタグを除き、空白をまとめる", () => {
    expect(valueToPlainText("<p>今日は</p>\n<ul><li>走った</li></ul>")).toBe("今日は 走った");
  });

  it("実体参照を元の文字に戻す", () => {
    expect(valueToPlainText("<p>a&nbsp;&amp;&nbsp;b &lt;c&gt;</p>")).toBe("a & b <c>");
  });

  it("ラベル付きは全ラベルの本文を連結する", () => {
    expect(valueToPlainText({ Good: "<p>早起き</p>", Bad: "<p>夜更かし</p>" })).toBe(
      "早起き 夜更かし",
    );
  });

  it("チェックリストは空でない項目のテキストを連結する", () => {
    expect(
      valueToPlainText([
        { text: "買い物", checked: true },
        { text: " ", checked: false },
        { text: "掃除", checked: false },
      ]),
    ).toBe("買い物 掃除");
  });

  it("習慣の値はテキストにしない", () => {
    expect(valueToPlainText({ habit1: true, habit2: false })).toBe("");
  });
});

describe("previewFromValues", () => {
  it("最初の空でない値のテキストを返す", () => {
    expect(
      previewFromValues([{ value: "<p></p>" }, { value: { h: true } }, { value: "<p>本文</p>" }]),
    ).toBe("本文");
  });

  it("全部空なら空文字", () => {
    expect(previewFromValues([{ value: "" }])).toBe("");
  });
});
