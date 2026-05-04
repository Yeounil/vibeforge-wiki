import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { WikiPageMeta } from "./WikiPageMeta";

describe("WikiPageMeta", () => {
  afterEach(() => cleanup());

  it("renders three tabs with default = 관련 위키", () => {
    render(
      <WikiPageMeta
        backlinksCount={4}
        relatedQACount={7}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent("관련 위키");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("bl")).toBeInTheDocument();
  });

  it("includes counts in tab labels", () => {
    render(
      <WikiPageMeta
        backlinksCount={4}
        relatedQACount={7}
        backlinksSlot={<div />}
        relatedQASlot={<div />}
        commentsSlot={<div />}
      />
    );
    expect(screen.getByRole("tab", { name: /관련 위키.*4/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Q&A.*7/ })).toBeInTheDocument();
  });

  it("does NOT mount comments slot until comments tab is activated", () => {
    render(
      <WikiPageMeta
        backlinksCount={1}
        relatedQACount={1}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    expect(screen.queryByTestId("cm")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /댓글/ }));
    expect(screen.getByTestId("cm")).toBeInTheDocument();
  });

  it("keeps comments mounted after first activation (lazy-once semantics)", () => {
    render(
      <WikiPageMeta
        backlinksCount={1}
        relatedQACount={1}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: /댓글/ }));
    expect(screen.getByTestId("cm")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /관련 위키/ }));
    expect(screen.getByTestId("cm")).toBeInTheDocument();
  });

  it("hides on lg viewports via lg:hidden class on the wrapper", () => {
    const { container } = render(
      <WikiPageMeta
        backlinksCount={0}
        relatedQACount={0}
        backlinksSlot={<div />}
        relatedQASlot={<div />}
        commentsSlot={<div />}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/lg:hidden/);
  });
});
