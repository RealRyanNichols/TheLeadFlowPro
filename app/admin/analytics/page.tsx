import AdminDashboard from "@/components/analytics/AdminDashboard";

export const metadata = { title: "Analytics | The LeadFlow Pro" };

// Auth + admin-role enforcement happens in the /admin layout (redirects) and
// again inside every admin_analytics_* database function (is_admin() gate) —
// the UI never receives data a non-admin could not query anyway.
export default function AdminAnalyticsPage() {
  return (
    <div>
      <p className="mb-5 text-[var(--muted)]">
        First-party data from your own database. Admin traffic is excluded,
        bots are filtered, and every metric card explains itself — hover the info dots.
      </p>
      <AdminDashboard />
    </div>
  );
}
