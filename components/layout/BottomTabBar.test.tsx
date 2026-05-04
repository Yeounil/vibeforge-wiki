import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BottomTabBar } from "./BottomTabBar";

const usePathnameMock = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("BottomTabBar", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });
  afterEach(() => cleanup());

  it("renders four tabs in order: Wiki, Forum, Graph, About", () => {
    usePathnameMock.mockReturnValue("/");
    render(<BottomTabBar />);
    const labels = screen
      .getAllByRole("link")
      .map((a) => a.textContent?.replace(/[^a-zA-Z]/g, "").trim());
    expect(labels).toEqual(["Wiki", "Forum", "Graph", "About"]);
  });

  it("marks Wiki active when path is /wiki", () => {
    usePathnameMock.mockReturnValue("/wiki");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: /Wiki/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Forum/ })).not.toHaveAttribute("aria-current");
  });

  it("marks Wiki active for any /wiki/<sub> path", () => {
    usePathnameMock.mockReturnValue("/wiki/concepts/SQL");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: /Wiki/ })).toHaveAttribute("aria-current", "page");
  });

  it("marks Graph active for /wiki/graph (more specific match wins over Wiki)", () => {
    usePathnameMock.mockReturnValue("/wiki/graph");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: /Graph/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Wiki/ })).not.toHaveAttribute("aria-current");
  });

  it("marks Forum active for /forum/post/<id>", () => {
    usePathnameMock.mockReturnValue("/forum/post/abc-123");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: /Forum/ })).toHaveAttribute("aria-current", "page");
  });

  it("hides on lg breakpoint via lg:hidden class", () => {
    usePathnameMock.mockReturnValue("/");
    render(<BottomTabBar />);
    const nav = screen.getByRole("navigation", { name: /bottom/i });
    expect(nav.className).toMatch(/lg:hidden/);
  });
});
