import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Route } from "next";
import { Pill } from "./Pill";

describe("Pill", () => {
  it("renders a button by default with primary variant", () => {
    render(<Pill>Submit</Pill>);
    const btn = screen.getByRole("button", { name: "Submit" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.className).toContain("bg-[var(--brand-gradient)]");
  });

  it("renders an anchor when href is provided", () => {
    render(<Pill href={"/login" as Route}>Login</Pill>);
    const link = screen.getByRole("link", { name: "Login" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/login");
  });

  it("applies secondary variant classes", () => {
    render(<Pill variant="secondary">Cancel</Pill>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-[var(--canvas)]");
    expect(btn.className).toContain("text-[var(--ink)]");
  });

  it("applies magenta variant classes", () => {
    render(<Pill variant="magenta">Promo</Pill>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-[var(--accent-magenta)]");
  });

  it("forwards onClick", async () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>Click</Pill>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });

  it("applies sm size classes", () => {
    render(<Pill size="sm">x</Pill>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-sm");
    expect(btn.className).toContain("px-[var(--s-md)]");
  });
});
