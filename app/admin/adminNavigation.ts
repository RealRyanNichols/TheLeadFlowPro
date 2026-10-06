import { MENU_GROUPS, CALL_SHEET_HREF, currentHref } from "./backOfficeNav";
export type AdminDestination = { href: string; label: string; hint?: string; external?: boolean };
export type AdminGroup = { label: string; ownerOnly?: boolean; items: AdminDestination[] };

export const ADMIN_GROUPS: AdminGroup[] = [
  { label: "Workspace", ownerOnly: true, items: [
    { href: "/admin/overview", label: "Today", hint: "Priorities and verified activity" },
    { href: "/admin/overview?view=work", label: "Work board", hint: "Owners, next actions and delivery" },
    { href: "/admin/overview?view=marketing", label: "Performance", hint: "Meta, intake and calls" },
    { href: "/admin/overview?view=plan", label: "Plan & costs", hint: "Goals, scenarios and evidence" },
    { href: "/admin/overview?view=library", label: "Business library", hint: "Reviewed conversation context" },
    { href: "/admin/overview?view=connections", label: "API readiness", hint: "What passed and what remains" },
    { href: "/admin/overview?view=tools", label: "Tools & reports", hint: "Existing operational destinations" },
  ] },
  ...MENU_GROUPS.map(group => ({ label: group.title, items: group.links.map(link => ({ href: link.href, label: link.label, hint: link.description, external: link.external })) })),

];

export function adminGroupsFor(ownerAccess: boolean, scope: "admin" | "sales" = "admin"): AdminGroup[] {
  if (scope === "sales") return [{ label: "Sales workspace", items: [
    { href: "/admin/sales", label: "Today" },
    { href: "/admin/sales/uncalled", label: "Uncalled" },
    { href: "/admin/sales/pipeline", label: "Pipeline" },
    { href: "/admin/sales/follow-ups", label: "Follow-ups" },
    { href: "/admin/sales/delivery", label: "Delivery Center" },
    { href: "/admin/sales/invoices", label: "Invoices" },
    { href: "https://sites.theleadflowpro.com", label: "Sites", external: true },
    { href: "/dashboard", label: "Member portal" },
  ] }];
  const groups = ADMIN_GROUPS.filter(group => !group.ownerOnly || ownerAccess);
  return groups.map(group => group.label === "Calls and leads" ? { ...group, items: [{ href: CALL_SHEET_HREF, label: "Today's calls", hint: "The live call sheet" }, ...group.items, { href: "/admin/sales/pipeline", label: "Sales pipeline" }] } : group.label === "Clients" ? { ...group, items: [...group.items, { href: "/admin/sales/delivery", label: "Delivery Center" }] } : group);

}

export function destinationActive(href: string, pathname: string, view = "today"): boolean {
  if (href.startsWith("https:")) return false;
  const [path, query = ""] = href.split("?");
  if (path === "/admin/overview") return pathname === path && (new URLSearchParams(query).get("view") || "today") === view;
  const extra = ["/admin/sales/pipeline", "/admin/sales/delivery"];
  const selected = extra.find(href => pathname === href || pathname.startsWith(href + "/")) || currentHref(pathname);
  return selected === path;
}

/** Five daily destinations; remaining routes stay in the expandable directory and search. */
export function primaryDestinationsFor(ownerAccess: boolean, scope: "admin" | "sales" = "admin"): AdminDestination[] {
 if (scope === "sales") return [
  {href:"/admin/sales",label:"Today"},{href:"/admin/sales/pipeline",label:"Sales"},
  {href:"/admin/sales/follow-ups",label:"Follow-ups"},{href:"/admin/sales/delivery",label:"Delivery"},
 ];
 return [
  {href:ownerAccess?"/admin/overview":"/admin/call-sheet",label:"Today"},
  {href:"/admin/sales",label:"Sales"},
  {href:"/admin/clients",label:"Clients"},
  {href:ownerAccess?"/admin/overview?view=marketing":"/admin/analytics",label:"Analytics"},
  {href:ownerAccess?"/admin/overview?view=work":"/admin/projects",label:"Operations"},
 ];
}
