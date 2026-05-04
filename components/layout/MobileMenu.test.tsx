import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MobileMenu } from "./MobileMenu";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  }),
}));

describe("MobileMenu", () => {
  afterEach(() => cleanup());

  it("renders nothing when closed", () => {
    render(
      <MobileMenu open={false} onClose={() => {}} isAdmin={false}>
        <span data-testid="search-slot" />
      </MobileMenu>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with search slot, About, login when open", () => {
    render(
      <MobileMenu open={true} onClose={() => {}} isAdmin={false}>
        <span data-testid="search-slot">SEARCH</span>
      </MobileMenu>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("search-slot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /About/i })).toBeInTheDocument();
  });

  it("renders Admin link only when isAdmin=true", () => {
    const { rerender } = render(
      <MobileMenu open={true} onClose={() => {}} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    expect(screen.queryByRole("link", { name: /Admin/i })).toBeNull();

    rerender(
      <MobileMenu open={true} onClose={() => {}} isAdmin={true}>
        <span />
      </MobileMenu>
    );
    expect(screen.getByRole("link", { name: /Admin/i })).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={true} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    const backdrop = screen.getByTestId("mobilemenu-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={true} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on Escape when closed", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={false} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
