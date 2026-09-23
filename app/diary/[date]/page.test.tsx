// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import DiaryDateRedirect from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("旧 URL /diary/[date]", () => {
  it("/?d=YYYY-MM-DD に転送する", async () => {
    await expect(DiaryDateRedirect({ params: Promise.resolve({ date: "2026-09-24" }) })).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith("/?d=2026-09-24");
  });

  it("不正な日付なら / に転送する", async () => {
    await expect(DiaryDateRedirect({ params: Promise.resolve({ date: "today" }) })).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith("/");
  });
});
