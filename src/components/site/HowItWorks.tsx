const STEPS = [
  {
    n: "01",
    title: "Connect everything in 3 minutes",
    body: "Link your phone number, social accounts, and ad platforms. We handle the rest."
  },
  {
    n: "02",
    title: "AI reads your data",
    body: "Claude analyzes your followers, engagement, ad spend, and lead sources to find what's working."
  },
  {
    n: "03",
    title: "You get the playbook",
    body: "A daily insights feed: who to talk to, what to post, what ads to run, what copy to use."
  },
  {
    n: "04",
    title: "Close more without lifting a finger",
    body: "Missed-call text-back fires automatically. Lead inbox keeps every conversation alive."
  }
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 border-y border-white/5 bg-ink-900/40">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-accent-400 text-sm font-semibold uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            From scattered to <span className="funnel-text">unstoppable</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6 relative overflow-hidden">
              <div className="text-5xl font-extrabold funnel-text opacity-80">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-200 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
