import Image from "next/image";
import Link from "next/link";

/** One official mark across the public site and private workspaces. */
export default function BrandLockup({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`brand-lockup brand-official ${className}`}
      aria-label="The LeadFlow Pro home"
    >
      <span className="brand-mark brand-mark-logo" aria-hidden="true">
        <Image
          src="/images/brand/leadflow-logo.png"
          alt=""
          width={96}
          height={96}
          sizes="64px"
          priority
        />
      </span>
      <span className="brand-words">
        THE LEAD FLOW<small>PRO / YOUR NEXT MOVE</small>
      </span>
    </Link>
  );
}
