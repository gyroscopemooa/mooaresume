import type { Metadata } from "next";
import { isAdmin } from "@/server/admin/admin-session";
import { getSummary } from "@/server/admin/admin-repository";
import { AdminLogin } from "./admin-login";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: "MOOA 관리자",
  robots: { index: false, follow: false, nocache: true },
};

// Every screen here reads live cross-account data; nothing may be cached or
// prerendered at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MeensooLayout({ children }: { children: React.ReactNode }) {
  // The gate is here rather than in each page so a new page cannot be added
  // without it.
  if (!(await isAdmin())) return <AdminLogin />;

  // A count the operator should see without opening the tab; a failure to read
  // it must not take the whole console down.
  const summary = await getSummary().catch(() => null);

  return <AdminShell newInquiries={summary?.newInquiries ?? 0}>{children}</AdminShell>;
}
