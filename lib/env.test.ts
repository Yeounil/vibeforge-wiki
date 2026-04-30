import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPublicEnv, getServerEnv } from "./env";

const ORIGINAL = { ...process.env };

describe("env", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
  });
  afterEach(() => {
    process.env = ORIGINAL;
  });

  it("getPublicEnv returns NEXT_PUBLIC_* values when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-abc";
    const env = getPublicEnv();
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon-abc");
  });

  it("getPublicEnv throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("getServerEnv requires SUPABASE_SERVICE_ROLE_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServerEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
