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

  it("decodes HTML entities in heading text", () => {
    const html = `
      <h2 id="amp">특징 추출 &#x26; 변환</h2>
      <h2 id="named">A &amp; B</h2>
      <h2 id="dec">x &#38; y</h2>
      <h2 id="quote">&quot;hi&quot;</h2>
    `;
    render(<TableOfContents bodyHtml={html} />);
    expect(screen.getByRole("link", { name: "특징 추출 & 변환" })).toHaveAttribute("href", "#amp");
    expect(screen.getByRole("link", { name: "A & B" })).toHaveAttribute("href", "#named");
    expect(screen.getByRole("link", { name: "x & y" })).toHaveAttribute("href", "#dec");
    expect(screen.getByRole("link", { name: '"hi"' })).toHaveAttribute("href", "#quote");
  });
});
