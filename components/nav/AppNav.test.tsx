import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

import { AppNav } from "./AppNav";

/** サイドメニューで強調されている（背景色つきの）メニュー名。 */
const activeLabels = () =>
  screen
    .getAllByRole("link")
    .filter((a) => a.classList.contains("bg-zinc-800"))
    .map((a) => a.textContent);

beforeEach(() => {
  pathname.current = "/";
});

describe("AppNav", () => {
  it("全メニューをサイドメニューとタブバーの両方に表示する", () => {
    render(<AppNav />);

    for (const [label, href] of [
      ["Home", "/"],
      ["Review", "/review"],
      ["Idea", "/idea"],
      ["Search", "/search"],
      ["Settings", "/settings"],
    ]) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute("href", href);
    }
  });

  it.each([
    { path: "/", active: "Home" },
    { path: "/review", active: "Review" },
    { path: "/idea/abc", active: "Idea" },
    { path: "/settings/diary", active: "Settings" },
  ])("$path では $active を強調する", ({ path, active }) => {
    pathname.current = path;
    render(<AppNav />);

    expect(activeLabels()).toEqual([active]);
  });

  it("Home は / 以外では強調しない", () => {
    pathname.current = "/search";
    render(<AppNav />);

    expect(activeLabels()).toEqual(["Search"]);
  });
});
