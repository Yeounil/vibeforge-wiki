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

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("renders logo, nav links, search slot, and auth button", async () => {
    const ui = await SiteHeader({ searchSlot: <input data-testid="s" /> });
    render(ui);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByTestId("s")).toBeInTheDocument();
  });

  it("renders without search slot", async () => {
    const ui = await SiteHeader({});
    render(ui);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });

  it("omits Admin link for non-admin viewers", async () => {
    const ui = await SiteHeader({});
    render(ui);
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });
});
