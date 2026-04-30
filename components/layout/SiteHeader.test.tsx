// components/layout/SiteHeader.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("renders logo, nav links, and search slot", () => {
    render(<SiteHeader searchSlot={<input data-testid="s" />} />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByTestId("s")).toBeInTheDocument();
  });

  it("renders without search slot", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });
});
