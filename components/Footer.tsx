import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-400 sm:flex-row">
        <div>
          <span className="font-bold text-white">The LeadFlow Pro</span> · Real Ryan
          Nichols LLC
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/portfolio" className="hover:text-white">
            The Work
          </Link>
          <Link href="/showcase" className="hover:text-white">
            Showcase
          </Link>
          <Link href="/demo" className="hover:text-white">
            Demo Build
          </Link>
          <Link href="/events" className="hover:text-white">
            Events
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
          <Link href="/book" className="hover:text-white">
            Book a Call
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
