import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildPages } from "./ChildPages";

describe("ChildPages", () => {
  it("renders heading and items", () => {
    render(
      <ChildPages
        items={[
          { slug: "concepts/X", title: "X" },
          { slug: "concepts/Y", title: "Y" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "이 개념을 더 깊게 다루는 글" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("href", "/wiki/concepts/X");
    expect(screen.getByRole("link", { name: "Y" })).toHaveAttribute("href", "/wiki/concepts/Y");
  });

  it("returns null when items is empty", () => {
    const { container } = render(<ChildPages items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
