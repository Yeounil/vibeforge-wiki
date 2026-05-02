import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders Wiki › Category › ancestors › current", () => {
    render(
      <Breadcrumb
        category="concepts"
        categoryLabel="Concepts"
        chain={[
          { slug: "concepts/Database", title: "Database" },
          { slug: "concepts/DBMS", title: "DBMS" },
          { slug: null, title: "3-Level Schema" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute("href", "/wiki");
    expect(screen.getByRole("link", { name: "Concepts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Database" })).toHaveAttribute("href", "/wiki/concepts/Database");
    expect(screen.getByRole("link", { name: "DBMS" })).toHaveAttribute("href", "/wiki/concepts/DBMS");
    expect(screen.queryByRole("link", { name: "3-Level Schema" })).toBeNull();
    expect(screen.getByText("3-Level Schema")).toBeInTheDocument();
  });

  it("renders Wiki › Category › current for parentless pages", () => {
    render(
      <Breadcrumb
        category="concepts"
        categoryLabel="Concepts"
        chain={[{ slug: null, title: "Standalone" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Concepts" })).toBeInTheDocument();
    expect(screen.getByText("Standalone")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Standalone" })).toBeNull();
  });
});
