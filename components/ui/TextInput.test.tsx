import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("renders an input with placeholder", () => {
    render(<TextInput placeholder="Search" />);
    expect(screen.getByPlaceholderText("Search")).toBeTruthy();
  });

  it("uses canvas background and hairline border", () => {
    render(<TextInput placeholder="x" />);
    const input = screen.getByPlaceholderText("x");
    expect(input.className).toContain("bg-[var(--canvas)]");
    expect(input.className).toContain("border-[var(--hairline)]");
  });

  it("forwards value and onChange", () => {
    render(<TextInput value="hello" onChange={() => {}} placeholder="x" />);
    expect((screen.getByPlaceholderText("x") as HTMLInputElement).value).toBe("hello");
  });
});
