import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

async function getLeads() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/admin/leads`, {
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function AdminPage() {
  const leads = await getLeads();

  return <AdminClient leads={leads} />;
}
