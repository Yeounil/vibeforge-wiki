import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Prerequisites } from "./Prerequisites";

describe("Prerequisites", () => {
  it("renders heading and item links", () => {
    render(
      <Prerequisites
        items={[
          { slug: "concepts/A", title: "A" },
          { slug: "concepts/B", title: "B" },
        ]}
      />,
    );
    expect(screen.getByText("먼저 보면 좋아요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("href", "/wiki/concepts/A");
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("href", "/wiki/concepts/B");
  });

  it("returns null when items is empty", () => {
    const { container } = render(<Prerequisites items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
