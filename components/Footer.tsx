import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-[var(--muted)] sm:flex-row">
        <div>
          <span className="font-bold text-[var(--heading)]">The LeadFlow Pro</span> · Real Ryan
          Nichols LLC
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/pricing" className="hover:text-[var(--heading)]">
            Pricing
          </Link>
          <Link href="/portfolio" className="hover:text-[var(--heading)]">
            The Work
          </Link>
          <Link href="/showcase" className="hover:text-[var(--heading)]">
            Showcase
          </Link>
          <Link href="/demo" className="hover:text-[var(--heading)]">
            Demo Build
          </Link>
          <Link href="/events" className="hover:text-[var(--heading)]">
            Events
          </Link>
          <Link href="/contact" className="hover:text-[var(--heading)]">
            Contact
          </Link>
          <Link href="/book" className="hover:text-[var(--heading)]">
            Book a Call
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[var(--heading)]">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
