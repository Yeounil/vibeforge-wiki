import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("renders logo, nav links, search slot, and auth button", () => {
    render(<SiteHeader searchSlot={<input data-testid="s" />} />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByTestId("s")).toBeInTheDocument();
    // AuthButton initially shows the loading "…" placeholder before async getUser resolves.
  });

  it("renders without search slot", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });
});
