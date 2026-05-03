// app/admin/page.tsx — admin-only profile management.
// Non-admins (anon or user) get notFound() so the route does not advertise itself.
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { listAdminProfiles } from "@/lib/admin/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "Admin — VibeForge" };

export default async function AdminPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();
  const [rows, all] = await Promise.all([
    listAdminProfiles(supabase),
    getAllPages(),
  ]);
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="space-y-4">
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <h1 className="text-2xl font-bold">관리자</h1>
            <p className="text-sm text-[var(--ink-muted)] mt-2">
              사용자 권한을 관리합니다. 본인은 강등할 수 없어요.
            </p>
          </header>
          <section className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <AdminTable rows={rows} currentAdminId={adminUser.id} />
          </section>
        </div>
      }
    />
  );
}
