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

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders all three slots and header", () => {
    render(
      <AppShell
        sidebar={<div>SIDE</div>}
        main={<div>MAIN</div>}
        right={<div>RIGHT</div>}
      />
    );
    // sidebar appears in both the mobile drawer and the desktop aside
    expect(screen.getAllByText("SIDE").length).toBeGreaterThan(0);
    expect(screen.getByText("MAIN")).toBeInTheDocument();
    expect(screen.getByText("RIGHT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });

  it("omits right column when not provided", () => {
    render(<AppShell sidebar={<div>SIDE</div>} main={<div>MAIN</div>} />);
    expect(screen.queryByTestId("appshell-right")).not.toBeInTheDocument();
  });
});
