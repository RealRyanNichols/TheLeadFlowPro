export function SocialProof() {
  return (
    <section className="py-16">
      <div className="container">
        <div className="glass rounded-3xl p-8 md:p-12 grid md:grid-cols-3 gap-6 text-center">
          <Stat value="50" label="leads in one campaign" />
          <Stat value="$7.66" label="cost per lead" highlight />
          <Stat value="$382.88" label="total ad spend" />
        </div>
        <p className="text-center text-sm text-ink-300 mt-4">
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
            ? "text-5xl md:text-6xl font-extrabold funnel-text"
            : "text-5xl md:text-6xl font-extrabold text-white"
        }
      >
        {value}
      </div>
      <div className="mt-2 text-sm uppercase tracking-wider text-ink-300">
        {label}
      </div>
    </div>
  );
}
