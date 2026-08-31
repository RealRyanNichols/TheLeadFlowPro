import Link from "next/link";
import LiveOperatorRefresh from "./LiveOperatorRefresh";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_8px_24px_rgba(10,18,32,0.04)]">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <Link href="/admin/operator" className="rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]">Mission Control</Link>
          <Link href="/admin/operator/growth" className="rounded-xl px-3 py-2 text-[var(--blue)] hover:bg-[var(--accent-tint)]">Goal Mode</Link>
          <Link href="/admin/operator/prospects" className="rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]">Prospect Command</Link>
          <Link href="/proof-floor" target="_blank" className="rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]">Public Proof Floor ↗</Link>
        </nav>
        <LiveOperatorRefresh />
      </div>
      {children}
    </div>
  );
}
