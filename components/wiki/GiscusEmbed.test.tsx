import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GiscusEmbed } from "./GiscusEmbed";

beforeEach(() => {
  vi.unstubAllEnvs();
  cleanup();
});

describe("GiscusEmbed", () => {
  it("renders nothing when env vars are unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "");
    const { container } = render(<GiscusEmbed pathname="/wiki/x" />);
    expect(container.firstChild).toBeNull();
  });

  it("injects a giscus script with correct data attrs when env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "owner/repo");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "R_x");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "Page Comments");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "DIC_x");
    const { container } = render(<GiscusEmbed pathname="/wiki/x" />);
    const script = container.querySelector("script") as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script!.src).toBe("https://giscus.app/client.js");
    expect(script!.getAttribute("data-repo")).toBe("owner/repo");
    expect(script!.getAttribute("data-repo-id")).toBe("R_x");
    expect(script!.getAttribute("data-category")).toBe("Page Comments");
    expect(script!.getAttribute("data-category-id")).toBe("DIC_x");
    expect(script!.getAttribute("data-mapping")).toBe("pathname");
    expect(script!.getAttribute("data-theme")).toBe("preferred_color_scheme");
    expect(script!.getAttribute("data-lang")).toBe("ko");
  });

  it("does not inject the script twice on re-render with same pathname", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "owner/repo");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "R_x");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "Page Comments");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "DIC_x");
    const { container, rerender } = render(<GiscusEmbed pathname="/wiki/x" />);
    rerender(<GiscusEmbed pathname="/wiki/x" />);
    const scripts = container.querySelectorAll("script");
    expect(scripts.length).toBe(1);
  });
});
