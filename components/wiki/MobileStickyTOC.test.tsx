import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MobileStickyTOC } from "./MobileStickyTOC";

vi.mock("./useActiveHeading", () => ({
  useActiveHeading: () => "section-2",
}));

describe("MobileStickyTOC", () => {
  afterEach(() => cleanup());

  const headings = [
    { id: "section-1", text: "Intro", level: 2 as const },
    { id: "section-2", text: "Middle", level: 2 as const },
    { id: "section-3", text: "End", level: 2 as const },
  ];

  it("renders nothing when fewer than 3 headings", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings.slice(0, 2)}
        containerRef={containerRef}
      />
    );
    expect(screen.queryByRole("navigation", { name: /목차/i })).toBeNull();
  });

  it("renders title and active heading text", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="바이너리 트리"
        headings={headings}
        containerRef={containerRef}
      />
    );
    expect(screen.getByText("바이너리 트리", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Middle")).toBeInTheDocument();
  });

  it("opens sheet on toggle button click and lists all headings", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /목차 열기/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute("href", "#section-1");
    expect(screen.getByRole("link", { name: "Middle" })).toHaveAttribute("href", "#section-2");
    expect(screen.getByRole("link", { name: "End" })).toHaveAttribute("href", "#section-3");
  });

  it("closes sheet when a TOC link is clicked", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /목차 열기/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Intro" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides on lg viewports via lg:hidden class", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    const nav = screen.getByRole("navigation", { name: /목차/i });
    expect(nav.className).toMatch(/lg:hidden/);
  });
});
