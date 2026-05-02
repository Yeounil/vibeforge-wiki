// tests/e2e/wiki-qa-backlinks.spec.ts
// Read-only verification of wiki ↔ Q&A backlink surfaces. We seed a profile,
// a post, and a qa_wiki_refs row directly via service-role, then verify both
// pages render the relationship. Auth/OAuth flow is out of scope for plan 3
// e2e, so the create-action path is covered by unit tests + manual QA.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SEED_SLUG = "concepts/Memex";

let admin: ReturnType<typeof createClient>;
let userId: string;
let postId: string;

test.beforeAll(async () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "Supabase env not configured");
  admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create a fixture auth user so author_id satisfies the FK.
  const email = `plan4-fixture-${Date.now()}@example.com`;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { user_name: "plan4-fixture", name: "Plan4 Fixture" },
  });
  if (cErr) throw cErr;
  userId = created.user!.id;

  const { data: post, error: pErr } = await admin
    .from("posts")
    .insert({
      category: "qa",
      title: "PLAN4 FIXTURE: Wiki backlink smoke",
      body_md: `Refers to /wiki/${SEED_SLUG} and [[Memex]].`,
      author_id: userId,
      tags: [],
    })
    .select("id")
    .single();
  if (pErr) throw pErr;
  postId = post.id as string;

  const { error: rErr } = await admin
    .from("qa_wiki_refs")
    .insert({ post_id: postId, wiki_slug: SEED_SLUG });
  if (rErr) throw rErr;
});

test.afterAll(async () => {
  // beforeAll may have skipped before initializing admin (missing env).
  if (!admin) return;
  if (postId) await admin.from("posts").delete().eq("id", postId);
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test.describe("wiki ↔ Q&A backlinks", () => {
  test("wiki page lists the seeded Q&A post under 관련 토론", async ({ page }) => {
    await page.goto(`/wiki/${SEED_SLUG}`);
    const right = page.getByTestId("appshell-right");
    await expect(right.getByText("관련 토론")).toBeVisible();
    await expect(
      right.getByRole("link", { name: "PLAN4 FIXTURE: Wiki backlink smoke" })
    ).toBeVisible();
  });

  test("Q&A post page lists the wiki page under 이 글이 인용한 위키", async ({ page }) => {
    await page.goto(`/forum/post/${postId}`);
    const right = page.getByTestId("appshell-right");
    await expect(right.getByText("이 글이 인용한 위키")).toBeVisible();
    // The seed page's frontmatter title is "Memex" — RelatedWiki
    // renders titleMap[slug] which is that title.
    await expect(
      right.getByRole("link", { name: "Memex" })
    ).toBeVisible();
  });
});
