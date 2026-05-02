// components/layout/Sidebar.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import type { VaultHierarchy } from "@/lib/wiki/hierarchy";

const PAGES = [
  { slug: "concepts/Memex", title: "Memex", category: "concepts" },
  { slug: "people/Vannevar Bush", title: "Vannevar Bush", category: "people" },
  { slug: "entities/Oracle", title: "Oracle", category: "entities" },
];

describe("Sidebar", () => {
  it("renders category labels and child pages grouped", () => {
    render(<Sidebar pages={PAGES} tree={{}} currentSlug={null} />);
    expect(screen.getByText("Concepts")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Entities")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Memex" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current=page", () => {
    render(<Sidebar pages={PAGES} tree={{}} currentSlug="concepts/Memex" />);
    const link = screen.getByRole("link", { name: "Memex" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});

const TREE_PAGES = [
  { slug: "concepts/Database", title: "Database", category: "concepts" },
  { slug: "concepts/DBMS", title: "DBMS", category: "concepts" },
  { slug: "concepts/3-Level-Schema", title: "3-Level Schema", category: "concepts" },
  { slug: "concepts/Standalone", title: "Standalone", category: "concepts" },
];

const TREE: VaultHierarchy = {
  concepts: {
    roots: ["concepts/Database", "concepts/Standalone"],
    children: {
      "concepts/Database": ["concepts/DBMS"],
      "concepts/DBMS": ["concepts/3-Level-Schema"],
      "concepts/3-Level-Schema": [],
      "concepts/Standalone": [],
    },
    parents: {
      "concepts/DBMS": "concepts/Database",
      "concepts/3-Level-Schema": "concepts/DBMS",
    },
    prerequisites: {},
  },
};

describe("Sidebar tree mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nested tree under category and shows disclosure for nodes with children", () => {
    render(
      <Sidebar
        pages={TREE_PAGES}
        tree={TREE}
        currentSlug="concepts/3-Level-Schema"
      />,
    );
    const databaseToggle = screen.getByRole("button", { name: /Database/ });
    expect(databaseToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "3-Level Schema" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Standalone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Standalone/ })).toBeNull();
  });

  it("clicking disclosure toggles expansion and persists in localStorage", () => {
    render(<Sidebar pages={TREE_PAGES} tree={TREE} currentSlug={null} />);
    const databaseToggle = screen.getByRole("button", { name: /Database/ });
    expect(databaseToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(databaseToggle);
    expect(databaseToggle).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem("vf:sidebar:expanded:concepts/Database")).toBe("1");
  });

  it("falls back to flat list when tree is empty", () => {
    render(<Sidebar pages={TREE_PAGES} tree={{}} currentSlug={null} />);
    expect(screen.getByRole("link", { name: "Database" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DBMS" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "3-Level Schema" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Database/ })).toBeNull();
  });
});
