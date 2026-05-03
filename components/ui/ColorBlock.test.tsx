import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ColorBlock } from "./ColorBlock";

function getRoot(text: string): HTMLElement {
  // ColorBlock renders the variant tag (section/div) directly with children inside.
  // Find the element whose textContent === text and whose className contains "bg-[var(--block-".
  const node = screen.getByText(text);
  return node;
}

describe("ColorBlock", () => {
  it("renders as <section> by default", () => {
    render(<ColorBlock variant="lilac">content</ColorBlock>);
    const el = getRoot("content");
    expect(el.tagName).toBe("SECTION");
  });

  it("applies lilac background variant", () => {
    render(<ColorBlock variant="lilac">x</ColorBlock>);
    expect(getRoot("x").className).toContain("bg-[var(--block-lilac)]");
  });

  it("applies navy variant with inverse ink", () => {
    render(<ColorBlock variant="navy">x</ColorBlock>);
    const el = getRoot("x");
    expect(el.className).toContain("bg-[var(--block-navy)]");
    expect(el.className).toContain("text-[var(--ink-inverse)]");
  });

  it("renders as <div> when as='div'", () => {
    render(<ColorBlock variant="mint" as="div">x</ColorBlock>);
    expect(getRoot("x").tagName).toBe("DIV");
  });
});
