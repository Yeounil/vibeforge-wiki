// components/layout/Sidebar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const PAGES = [
  { slug: "data-handling/what-is-an-index", title: "인덱스가 뭐예요?", category: "data-handling" },
  { slug: "how-computers-work/what-is-a-process", title: "프로세스가 뭐예요?", category: "how-computers-work" },
  { slug: "code-flow/what-is-an-array", title: "배열이 뭐예요?", category: "code-flow" },
];

describe("Sidebar", () => {
  it("renders category labels and child pages grouped", () => {
    render(<Sidebar pages={PAGES} currentSlug={null} />);
    expect(screen.getByText("데이터 다루기")).toBeInTheDocument();
    expect(screen.getByText("컴퓨터는 어떻게 일하나")).toBeInTheDocument();
    expect(screen.getByText("코드 흐름")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current=page", () => {
    render(<Sidebar pages={PAGES} currentSlug="data-handling/what-is-an-index" />);
    const link = screen.getByRole("link", { name: "인덱스가 뭐예요?" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
