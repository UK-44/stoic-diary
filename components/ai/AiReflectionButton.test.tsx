import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const { openChatGptReflection } = vi.hoisted(() => ({ openChatGptReflection: vi.fn() }));
vi.mock("@/lib/ai/reflection", () => ({ openChatGptReflection }));

import { AiReflectionButton } from "./AiReflectionButton";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AiReflectionButton", () => {
  it("押すとプロンプトを渡して ChatGPT を開き、コピーしたことを表示する", () => {
    render(<AiReflectionButton prompt="振り返って" />);

    fireEvent.click(screen.getByRole("button", { name: /AI振り返り/ }));

    expect(openChatGptReflection).toHaveBeenCalledWith("振り返って");
    expect(screen.getByRole("button")).toHaveTextContent("プロンプトをコピーしました");
  });

  it("2.5 秒後に元の表示に戻る", () => {
    render(<AiReflectionButton prompt="振り返って" />);
    fireEvent.click(screen.getByRole("button"));

    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(screen.getByRole("button")).toHaveTextContent("プロンプトをコピーしました");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("button")).toHaveTextContent("AI振り返り");
  });

  it("buildPrompt があれば押した時点で組み立てる", () => {
    const buildPrompt = vi.fn(() => "最新の入力");
    render(<AiReflectionButton prompt="古い" buildPrompt={buildPrompt} />);

    expect(buildPrompt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button"));

    expect(openChatGptReflection).toHaveBeenCalledWith("最新の入力");
  });

  it.each([undefined, "  "])("プロンプトが空（%j）なら何もしない", (prompt) => {
    render(<AiReflectionButton prompt={prompt} />);

    fireEvent.click(screen.getByRole("button"));

    expect(openChatGptReflection).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveTextContent("AI振り返り");
  });
});
