export function SocialProof() {
  return (
    <section className="py-8 md:py-16">
      <div className="container">
        <div className="glass rounded-3xl p-5 md:p-12 grid grid-cols-3 gap-3 md:gap-6 text-center">
          <Stat value="50" label="leads / campaign" />
          <Stat value="$7.66" label="cost per lead" highlight />
          <Stat value="$382.88" label="total ad spend" />
        </div>
        <p className="text-center text-xs md:text-sm text-ink-300 mt-3 md:mt-4">
          Real numbers from a real LeadFlow Pro client (dental practice, Longview TX)
        </p>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  highlight
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        className={
          highlight
            ? "text-2xl md:text-6xl font-extrabold funnel-text"
            : "text-2xl md:text-6xl font-extrabold text-white"
        }
      >
        {value}
      </div>
      <div className="mt-1 md:mt-2 text-[10px] md:text-sm uppercase tracking-wider text-ink-300">
        {label}
      </div>
    </div>
  );
}
