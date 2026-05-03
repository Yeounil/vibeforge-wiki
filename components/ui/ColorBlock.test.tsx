import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ColorBlock } from "./ColorBlock";

describe("ColorBlock", () => {
  it("renders as <section> by default", () => {
    render(<ColorBlock variant="lilac">content</ColorBlock>);
    const el = screen.getByText("content").parentElement!;
    expect(el.tagName).toBe("SECTION");
  });

  it("applies lilac background variant", () => {
    render(<ColorBlock variant="lilac">x</ColorBlock>);
    expect(screen.getByText("x").parentElement!.className).toContain(
      "bg-[var(--block-lilac)]"
    );
  });

  it("applies navy variant with inverse ink", () => {
    render(<ColorBlock variant="navy">x</ColorBlock>);
    const el = screen.getByText("x").parentElement!;
    expect(el.className).toContain("bg-[var(--block-navy)]");
    expect(el.className).toContain("text-[var(--ink-inverse)]");
  });

  it("renders as <div> when as='div'", () => {
    render(<ColorBlock variant="mint" as="div">x</ColorBlock>);
    expect(screen.getByText("x").parentElement!.tagName).toBe("DIV");
  });
});
