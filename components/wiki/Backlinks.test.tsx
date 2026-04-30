import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Backlinks } from "./Backlinks";

const titleMap = {
  "a/page-1": "First Page",
  "a/page-2": "Second Page",
};

describe("Backlinks", () => {
  it("renders a list of links to backlinking pages", () => {
    render(<Backlinks slugs={["a/page-1", "a/page-2"]} titleMap={titleMap} />);
    const link1 = screen.getByRole("link", { name: "First Page" });
    expect(link1).toHaveAttribute("href", "/wiki/a/page-1");
    const link2 = screen.getByRole("link", { name: "Second Page" });
    expect(link2).toHaveAttribute("href", "/wiki/a/page-2");
  });

  it("renders nothing when there are no backlinks", () => {
    const { container } = render(<Backlinks slugs={[]} titleMap={titleMap} />);
    expect(container.firstChild).toBeNull();
  });

  it("falls back to slug if title is missing", () => {
    render(<Backlinks slugs={["x/y"]} titleMap={{}} />);
    expect(screen.getByRole("link", { name: "x/y" })).toBeInTheDocument();
  });
});
