import { createClient } from "@/lib/supabase/server";
import InvoiceBuilder from "./InvoiceBuilder";

export const metadata = { title: "Invoices | LeadFlow Pro Sales Desk" };

export default async function SalesInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const supabase = await createClient();
  const [{ data: leads }, { data: invoices }, params] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, business_name, email")
      .is("deleted_at", null)
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    searchParams,
  ]);

  return (
    <InvoiceBuilder
      leads={leads ?? []}
      initialInvoices={invoices ?? []}
      initialLeadId={params.lead ?? ""}
    />
  );
}
