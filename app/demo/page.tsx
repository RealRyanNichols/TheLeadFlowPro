import Link from "next/link";

export const metadata = {
  title: "Demo Build: Piney Woods Coffee Co. | The LeadFlow Pro",
  description:
    "A sample client build on the Own Your Platform stack — see the funnel, the tracking, the lead capture, and the back office a LeadFlow Pro build includes.",
  openGraph: { images: [{ url: "/og/demo.png", width: 1200, height: 630 }] },
};

// A fictional East Texas business used to show what a build looks like.
// Every annotation explains the real machinery a client build ships with.

function Hood({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 backdrop-blur">
      <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">
        ⚙ Under the hood: {label}
      </span>
      <p className="mt-1 text-xs text-slate-300">{children}</p>
    </div>
  );
}

export default function DemoPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {/* FRAME */}
      <div className="rounded-2xl border border-violet-400/40 bg-violet-500/10 p-4 text-center backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-widest text-violet-300">
          Demo build — sample client
        </p>
        <p className="mt-1 text-sm text-slate-300">
          "Piney Woods Coffee Co." is a fictional Longview coffee shop. Everything
          below is the real architecture a LeadFlow Pro build ships with — the
          annotations show you what's working underneath.
        </p>
      </div>

      {/* ===== THE DEMO SITE ===== */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-ink/60 shadow-glow-violet">
        {/* demo nav */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <span className="font-black text-white">
            Piney Woods <span className="text-amber-300">Coffee Co.</span>
          </span>
          <span className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white">
            Order Ahead
          </span>
        </div>

        {/* demo hero */}
        <div className="px-6 py-10 text-center">
          <h1 className="text-3xl font-black text-white sm:text-4xl">
            East Texas roasts. <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Zero corporate coffee.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Small-batch roasting in Longview since day one. Join the Roast Club
            and get first pour on every new batch.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <span className="cursor-default rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-[0_0_24px_rgba(251,146,60,0.35)]">
              Join the Roast Club
            </span>
            <span className="cursor-default rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-slate-200">
              This Week's Menu
            </span>
          </div>
          <Hood label="the funnel">
            One message, one action — built for Facebook and Google ad traffic.
            Every visit is logged to the owner's own database with UTM source,
            and the Meta Pixel and Google tag fire from day one so ads optimize
            on real conversions.
          </Hood>
        </div>

        {/* demo offer strip */}
        <div className="grid gap-4 border-y border-white/10 bg-white/[0.03] px-6 py-8 sm:grid-cols-3">
          {[
            { name: "Roast Club", desc: "Monthly beans, member pricing, first pour on new batches.", tag: "SUBSCRIPTION" },
            { name: "Order Ahead", desc: "Skip the line. Your usual, ready when you walk in.", tag: "REPEAT SALES" },
            { name: "Events at the Shop", desc: "Cuppings, latte art nights, small-biz meetups.", tag: "COMMUNITY" },
          ].map((o) => (
            <div key={o.name} className="card !p-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">{o.tag}</span>
              <h3 className="mt-1 font-bold text-white">{o.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{o.desc}</p>
            </div>
          ))}
        </div>

        {/* demo lead form */}
        <div className="grid gap-8 px-6 py-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">Join the Roast Club</h2>
            <p className="mt-2 text-sm text-slate-300">
              First batch alert goes out Friday. Members get 20% off their first
              bag.
            </p>
            <Hood label="lead capture → instant follow-up">
              A real build saves this form straight into the owner's OWN
              database (not a vendor's), alerts the owner by email the second it
              lands, and fires an instant welcome email to the customer in the
              owner's voice. No Mailchimp bill. No AWeber bill.
            </Hood>
            <Hood label="the money math">
              This entire site runs on $0–25/mo of infrastructure the owner
              controls — replacing a $200–500/mo rented stack. Same sourced
              pricing as the calculator on our home page.
            </Hood>
          </div>
          <div className="card">
            <div className="space-y-4 opacity-80">
              <div>
                <label className="label">Your name</label>
                <input className="input" disabled placeholder="Demo form — inputs disabled" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" disabled placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Usual order</label>
                <input className="input" disabled placeholder="Oat milk latte, extra shot" />
              </div>
              <span className="btn-primary block w-full cursor-default text-center opacity-90">
                Count Me In
              </span>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Demo form. Your real one writes to YOUR database and triggers YOUR
              automations.
            </p>
          </div>
        </div>
      </div>

      {/* ===== WHAT THE OWNER SEES ===== */}
      <h2 className="mt-14 text-center text-2xl font-black text-white sm:text-3xl">
        And here's the part nobody else gives you: <span className="text-gradient">the back office</span>
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-400">
        Every build includes an owner dashboard — leads, messages, analytics, and
        project tracking on your own domain. This is sample data from the demo shop.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: "1,284", l: "page views · 30 days", c: "text-white" },
          { v: "312", l: "visitors", c: "text-sky-300" },
          { v: "47", l: "Roast Club signups", c: "text-mint glow-mint" },
          { v: "$0", l: "paid to Mailchimp", c: "text-mint" },
        ].map((s) => (
          <div key={s.l} className="card !p-4 text-center">
            <div className={`text-3xl font-black ${s.c}`}>{s.v}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <h3 className="font-bold text-white">Latest leads <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">sample data</span></h3>
        <div className="mt-3 space-y-2 text-sm">
          {[
            { n: "Katie B.", s: "facebook / roast-club ad", t: "2 min ago", status: "new" },
            { n: "Marcus T.", s: "google / order-ahead", t: "1 hr ago", status: "emailed" },
            { n: "Deb W.", s: "shared link", t: "3 hrs ago", status: "member" },
          ].map((l) => (
            <div key={l.n} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink p-3">
              <div>
                <span className="font-semibold text-white">{l.n}</span>
                <span className="ml-2 text-xs text-slate-400">{l.s}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{l.t}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${l.status === "new" ? "bg-sky-500/20 text-sky-300" : l.status === "emailed" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {l.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Attribution flows in automatically from UTM-tagged ads — the owner sees
          exactly which ad every lead came from.
        </p>
      </div>

      {/* CTA */}
      <div className="card mt-12 border border-sky-400/40 text-center shadow-glow-blue">
        <h2 className="text-2xl font-black text-white">
          Want this with YOUR name on the door?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-300">
          Coffee shop, dental office, law firm, gym, church, home services — the
          architecture is the same: your funnel, your data, your keys. Thirty
          minutes and you'll know your next three moves.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/book?utm_source=demo&utm_medium=site&utm_campaign=demo-build" className="btn-primary">
            Book a Call
          </Link>
          <Link href="/showcase" className="btn-ghost">
            See the Live Command Center
          </Link>
          <Link href="/portfolio" className="btn-ghost">
            Real Builds
          </Link>
        </div>
      </div>
    </section>
  );
}
