import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RightPanel } from "./RightPanel";

describe("RightPanel", () => {
  it("renders children inside a card surface", () => {
    render(<RightPanel><div>contents</div></RightPanel>);
    expect(screen.getByText("contents")).toBeInTheDocument();
    const region = screen.getByLabelText("Page context");
    expect(region).toBeInTheDocument();
  });
});
