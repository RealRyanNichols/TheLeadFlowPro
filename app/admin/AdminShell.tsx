"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, LayoutDashboard, Menu, Moon, Phone, Search, Sun, X } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { adminGroupsFor, destinationActive } from "./adminNavigation";

export default function AdminShell({ children, ownerAccess, name, ownerLogin, scope = "admin" }: {
  children: React.ReactNode; ownerAccess: boolean; name: string; ownerLogin: string | null; scope?: "admin" | "sales";
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") || "today";
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => adminGroupsFor(ownerAccess, scope), [ownerAccess, scope]);
  const destinations = groups.flatMap(group => group.items.map(item => ({ ...item, group: group.label })));
  const current = destinations.find(item => destinationActive(item.href, pathname, view));
  const matches = destinations.filter(item => !query || `${item.label} ${item.hint || ""} ${item.group}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { setMenuOpen(false); dialog.current?.close(); }, [pathname, view]);
  useEffect(() => { try { if (localStorage.getItem("leadflow-admin-theme") === "light") setTheme("light"); } catch {} }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); dialog.current?.showModal(); searchInput.current?.focus(); }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); try { localStorage.setItem("leadflow-admin-theme", next); } catch {} }
  const initials = name.split(" ").map(value => value[0]).slice(0, 2).join("");

  return <section id="lf-admin-shell" data-admin-theme={theme}>
    <a className="lf-admin-skip" href="#lf-admin-main">Skip to admin content</a>
    {menuOpen && <button className="lf-admin-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
    <aside className={`lf-admin-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Admin navigation" id="lf-admin-navigation">
      <Link className="lf-admin-brand" href={scope === "sales" ? "/admin/sales" : ownerAccess ? "/admin/overview" : "/admin"}>
        <img src="/admin-workspace/leadflow-logo.webp" width="44" height="44" alt="" />
        <span>LeadFlow<small>BUSINESS WORKSPACE</small></span>
      </Link>
      <div className="lf-admin-nav-groups">{groups.map(group => <details key={group.label} open className="lf-admin-nav-group">
        <summary>{group.label}<ChevronDown size={13} aria-hidden="true" /></summary>
        <nav aria-label={group.label}>{group.items.map(item => item.external
          ? <a key={item.href} className="lf-admin-nav-item" href={item.href} target="_blank" rel="noreferrer">{item.label}<ArrowUpRight size={13} aria-hidden="true" /></a>
          : <Link key={item.href} className={`lf-admin-nav-item ${destinationActive(item.href, pathname, view) ? "is-active" : ""}`} aria-current={destinationActive(item.href, pathname, view) ? "page" : undefined} href={item.href}>{item.label}</Link>)}</nav>
      </details>)}</div>
      <div className="lf-admin-profile"><span className="lf-admin-avatar">{initials}</span><div><strong>{name}</strong><small>{ownerLogin === "ryan" ? "CEO · Direction & relationships" : ownerLogin === "pat" ? "Strategy, creative & systems" : "Admin workspace"}</small></div><SignOutButton className="lf-admin-signout" /></div>
    </aside>
    <div className="lf-admin-body">
      <header className="lf-admin-topbar" data-admin-workspace-nav>
        <button className="lf-admin-icon lf-admin-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="lf-admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <div className="lf-admin-breadcrumb"><span>{current?.group || "LeadFlow admin"}</span><b>{current?.label || "Workspace"}</b></div>
        <div className="lf-admin-header-actions">
          <button className="lf-admin-search-button" aria-label="Search admin destinations, Control or Command K" onClick={() => { setQuery(""); dialog.current?.showModal(); searchInput.current?.focus(); }}><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button>
          <Link className="lf-admin-call-button" href={scope === "sales" ? "/admin/sales" : "/admin/call-sheet"}><Phone size={15} /><span>{scope === "sales" ? "Today" : "Today's calls"}</span></Link>
          <button className="lf-admin-icon" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </header>
      <main id="lf-admin-main" data-admin-frame className={`lf-admin-content ${pathname === "/admin/overview" ? "is-overview" : ""}`} tabIndex={-1}>{children}</main>
    </div>
    <dialog className="lf-admin-command" ref={dialog} aria-labelledby="lf-admin-search-title">
      <header><h2 id="lf-admin-search-title"><LayoutDashboard size={18} />Find a destination</h2><button className="lf-admin-icon" aria-label="Close search" onClick={() => dialog.current?.close()}><X size={18} /></button></header>
      <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search CRM, calls, projects, reports…" aria-label="Search admin destinations" />
      <div className="lf-admin-search-results">{matches.map(item => <a key={item.href} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined}><div><strong>{item.label}</strong><small>{item.hint || item.group}</small></div><ArrowUpRight size={16} /></a>)}{!matches.length && <p>No matching destination.</p>}</div>
      <footer>Existing routes and permissions apply to every destination.</footer>
    </dialog>
  </section>;
}
