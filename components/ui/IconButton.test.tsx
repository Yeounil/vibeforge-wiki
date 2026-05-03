import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renders with aria-label", () => {
    render(<IconButton aria-label="Next">→</IconButton>);
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });

  it("default variant uses surface-soft background", () => {
    render(<IconButton aria-label="X">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("bg-[var(--surface-soft)]");
  });

  it("inverse variant uses translucent white", () => {
    render(<IconButton variant="inverse" aria-label="X">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("bg-white/10");
  });

  it("forwards onClick", () => {
    const onClick = vi.fn();
    render(<IconButton aria-label="X" onClick={onClick}>x</IconButton>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });
});
