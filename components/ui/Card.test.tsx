import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders default variant with canvas background and hairline border", () => {
    render(<Card>x</Card>);
    const el = screen.getByText("x");
    expect(el.className).toContain("bg-[var(--canvas)]");
    expect(el.className).toContain("border-[var(--hairline)]");
  });

  it("renders soft variant with surface-soft background", () => {
    render(<Card variant="soft">x</Card>);
    const el = screen.getByText("x");
    expect(el.className).toContain("bg-[var(--surface-soft)]");
  });

  it("forwards className", () => {
    render(<Card className="extra">x</Card>);
    expect(screen.getByText("x").className).toContain("extra");
  });
});
