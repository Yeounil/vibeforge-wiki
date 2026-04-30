import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableOfContents } from "./TableOfContents";

const HTML = `
  <h2 id="intro">Intro</h2>
  <p>x</p>
  <h2 id="part-one">Part One</h2>
  <h3 id="detail">Detail</h3>
  <h2 id="conclusion">Conclusion</h2>
`;

describe("TableOfContents", () => {
  it("extracts h2 and h3 with anchor links", () => {
    render(<TableOfContents bodyHtml={HTML} />);
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute("href", "#intro");
    expect(screen.getByRole("link", { name: "Part One" })).toHaveAttribute("href", "#part-one");
    expect(screen.getByRole("link", { name: "Detail" })).toHaveAttribute("href", "#detail");
    expect(screen.getByRole("link", { name: "Conclusion" })).toHaveAttribute("href", "#conclusion");
  });

  it("renders nothing when there are no headings", () => {
    const { container } = render(<TableOfContents bodyHtml="<p>no headings</p>" />);
    expect(container.firstChild).toBeNull();
  });
});
