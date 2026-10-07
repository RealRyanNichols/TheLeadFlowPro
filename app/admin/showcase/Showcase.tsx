"use client";
import { memo, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Boxes, ChevronRight, Expand, Factory, GraduationCap, Layers3, Pause, Play, Radio, ShieldCheck, Sparkles, Tractor, TrendingUp, Zap } from "lucide-react";
import { forecast, type ShowcaseData, type ModelInput } from "@/lib/showcaseData";
import "./showcase.css";
import { SHOWCASE_PROOF as PROOF } from "@/lib/site/showcaseProof";
const moneyFormats = [new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}), new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2})];
const compactFormat = new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1});
const countFormat = new Intl.NumberFormat("en-US", {maximumFractionDigits:0});
const money = (n: number | null, decimals = 0) => n === null ? "—" : moneyFormats[decimals ? 1 : 0].format(n);
const compact = (n: number | null) => n === null ? "—" : compactFormat.format(n);
const count = (n: number | null) => n === null ? "—" : countFormat.format(n);
const DEFAULTS: Record<"dirt" | "education", ModelInput> = {
  dirt: { investment:8500,targetUnits:16,ticket:4500,margin:40,repeat:0,capacity:48 },
  education: { investment:2500,targetUnits:5,ticket:3000,margin:60,repeat:0,capacity:20 },
};

const SectorArt = memo(function SectorArt({ sector }: { sector: "dirt" | "education" }) {
  return <svg className="sector-art" viewBox="0 0 640 320" aria-hidden="true"><defs><linearGradient id="wire-light"><stop stopColor="#49dbff"/><stop offset="1" stopColor="#7568ff"/></linearGradient><filter id="wire-bloom"><feGaussianBlur stdDeviation="2"/></filter></defs><g className="wire-grid" fill="none" stroke="currentColor" opacity=".25">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 60 - 40},320 L320,120 L${i * 60 + 60},320`}/>)}{[180,200,230,270,310].map(y => <path key={y} d={`M0,${y}H640`}/>)}</g><g fill="none" stroke="url(#wire-light)" strokeWidth="2.2" strokeLinejoin="round">{sector === "dirt" ? <><path d="M145 210h275l24 26-17 30H133l-16-27z M160 224h252v27H153z M178 207v-71l58-19h59v91 M187 136h52v59h-52z M251 130h33v65h-33z M294 165l102-66 101 27 39 96 M392 101l14-13 98 25 38 112-27 23-29-7 20-35 M300 185h72l-16 23H299 M137 237h290"/><circle cx="165" cy="239" r="14"/><circle cx="219" cy="239" r="14"/><circle cx="272" cy="239" r="14"/><circle cx="326" cy="239" r="14"/><circle cx="379" cy="239" r="14"/><path d="M285 111l13-25 90-27 18 29 M515 244l45 15-8 21-48-4-17-20"/></> : <><path d="M126 223l188-47 197 45-182 58z M139 193l177-62 183 60-172 66z M182 201v-89l133-51 137 51v89 M176 112l138-55 145 55-142 56z M204 121v71 M245 138v65 M282 151v63 M351 152v63 M390 139v65 M428 123v72 M157 218v21l166 56 161-53v-19 M268 188v43 M283 188v43 M337 193v43 M352 191v43"/>{[204,245,283,351,392,429].map((x,i) => <path key={x} d={`M${x} ${i < 3 ? 121+i*15 : 151-(i-3)*14}l18-6v42l-18 6z`}/>)}</>}</g><g className="art-scan"><path d="M80 175h480" stroke="#74ecff" opacity=".8"/><circle cx="320" cy="175" r="5" fill="#9cf5ff"/></g></svg>;
});
function Slider({ label, value, min, max, step = 1, onChange, prefix = "", suffix = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; prefix?: string; suffix?: string }) {
  return <label className="fx-control"><span>{label}<b>{prefix}{value.toLocaleString()}{suffix}</b></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/></label>;
}
export default function Showcase({ data }: { data: ShowcaseData }) {
  const [industry, setIndustry] = useState<"dirt" | "education">("dirt");
  const [inputs, setInputs] = useState(DEFAULTS);
  const [tab, setTab] = useState<"forecast" | "proof">("forecast");
  const [paused, setPaused] = useState(false), [hidden, setHidden] = useState(false);
  const [selectedProof, setSelectedProof] = useState(0), [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = inputs[industry], model = forecast(industry, input), proof = PROOF[selectedProof];
  const dirt = industry === "dirt", unit = dirt ? "jobs" : "enrollments";
  const costLabel = dirt ? "COST PER NEW JOB" : "COST PER ACQUISITION";
  const put = (key: keyof ModelInput, n: number) => setInputs(x => ({ ...x, [industry]: { ...x[industry], [key]: n } }));
  useEffect(() => { const update = () => setHidden(document.hidden); update(); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  async function fullscreen() { if (!document.fullscreenElement) await root.current?.requestFullscreen?.(); else await document.exitFullscreen?.(); }
  const breakEvenProgress = Math.min(100, model.units && model.breakEven !== null ? model.breakEven / model.units * 100 : 0);
  const sector = dirt ? "DIRT WORKERS" : "EDUCATION";
  return <div ref={root} className={`fx-root fx-${industry} ${paused || hidden ? "fx-paused" : ""}`}>
    <div className="fx-atmosphere" aria-hidden="true"><div className="fx-mesh"/><div className="fx-orbit a"/><div className="fx-orbit b"/><div className="fx-grain"/></div>
    <header className="fx-header">
      <div className="fx-brand"><span className="fx-brand-mark"><img src="/admin-workspace/leadflow-logo.webp" alt="The LeadFlow Pro" width="54" height="54"/></span><div><strong>THE LEADFLOW PRO</strong><small>SPECIAL EFFECTS <i/> GROWTH SHOWCASE</small></div></div>
      <div className="fx-header-center"><span className="fx-signal-dot"/> YOUR NEXT LEVEL <span className="fx-divider">/</span> OUTCOME PLANNING</div>
      <div className="fx-actions"><button onClick={() => setPaused(!paused)} aria-label={paused ? "Resume motion" : "Pause motion"}>{paused ? <Play size={17}/> : <Pause size={17}/>}</button><button onClick={fullscreen} aria-label="Toggle fullscreen"><Expand size={17}/></button><button onClick={() => setLeaving(true)} aria-label="Return to private workspace"><ArrowLeft size={17}/></button></div>
    </header>
    <div className="fx-topline"><span><Radio size={13}/> BUILD THE BUSINESS YOU WANT TO RUN</span><span>CUSTOMER OUTCOMES <i/> HISTORICAL RESULTS <i/> INTERACTIVE SCENARIOS</span></div>
    <main className="fx-layout">
      <aside className="fx-left">
        <div className="fx-section-label">SELECT YOUR INDUSTRY <span>01 / 02</span></div>
        <button className={`fx-sector ${dirt ? "active" : ""}`} onClick={() => { setIndustry("dirt"); setTab("forecast"); }}><Tractor size={24}/><div><b>DIRT WORKERS</b><small>Land clearing · excavation · hauling</small></div><ChevronRight size={16}/></button>
        <button className={`fx-sector ${!dirt ? "active" : ""}`} onClick={() => { setIndustry("education"); setTab("forecast"); }}><GraduationCap size={24}/><div><b>EDUCATION</b><small>Schools · training · online programs</small></div><ChevronRight size={16}/></button>
        {tab === "forecast" ? <><div className="fx-panel fx-opportunity fx-goal">
          <span className="fx-kicker">YOUR GROWTH PLAN</span>
          <div className="fx-ring"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="74"/><circle className="progress" cx="90" cy="90" r="74" pathLength="100" strokeDasharray={`${breakEvenProgress} 100`}/></svg><div><small>{dirt ? "NEW CUSTOMER JOBS" : "ENROLLMENT GOAL"}</small><b>{count(model.units)}</b><span>{dirt ? "90-day scenario" : "Monthly cohort scenario"}</span></div></div>
          <p><b>{count(model.breakEven)} {unit}</b> cover your modeled campaign investment.</p>
        </div>
        <div className="fx-panel fx-customer-cost"><div className="fx-section-label">{costLabel}<span>MODELED</span></div><strong>{money(model.acquisitionCost)}</strong><p>{dirt ? "Campaign investment per new customer job. Follow-on work adds value." : "Campaign investment per new enrollment."}</p></div></> : <div className="fx-panel fx-proof-intro"><span className="fx-kicker">EXPERIENCE ACROSS INDUSTRIES</span><strong>{PROOF.length}</strong><h2>Historical examples.</h2><p>Explore reported business outcomes from past work, from local services to education.</p><Sparkles size={42}/></div>}
      </aside>
      <section className="fx-center">
        <div className="fx-view-heading"><div><span className="fx-kicker">{tab === "proof" ? "HISTORICAL RESULTS / INDUSTRY PROOF" : sector + " / YOUR GROWTH SCENARIO"}</span><h1>{tab === "proof" ? <>The experience<br/>behind <em>the results.</em></> : dirt ? <>More jobs.<br/><em>A bigger future.</em></> : <>Fill your next class.<br/><em>Grow your impact.</em></>}</h1></div><div className="fx-mode-tabs"><button className={tab === "forecast" ? "active" : ""} onClick={() => setTab("forecast")}><Zap size={13}/> GROWTH LAB</button><button className={tab === "proof" ? "active" : ""} onClick={() => setTab("proof")}><Layers3 size={13}/> RESULTS VAULT</button></div></div>
        {tab === "forecast" ? <>
          <div className="fx-stage"><div className="fx-stage-label"><span>SCENARIO / {dirt ? "90 DAYS" : "MONTHLY COHORT"}</span><b><Sparkles size={12}/> SEE WHAT YOUR GOAL COULD MEAN.</b></div><div className="fx-core"><div className="fx-core-ring one"/><div className="fx-core-ring two"/><div className="fx-core-ring three"/><div className="fx-core-number"><span>{dirt ? "PROJECTED CAMPAIGN JOBS" : "PROJECTED ENROLLMENTS"}</span><strong>{dirt ? model.totalJobs : model.units}</strong><small>{dirt ? `${model.units} new customers + ${model.totalJobs - model.units} follow-on jobs` : `${model.units} enrollments × ${money(input.ticket)} program value`}</small></div></div><SectorArt sector={industry}/><div className="fx-stage-edges"><span>{dirt ? "NEW CUSTOMERS → MORE WORK → YOUR GROWTH" : "NEW ENROLLMENTS → CLASS REVENUE → YOUR GROWTH"}</span><span>ILLUSTRATIVE SCENARIO</span></div></div>
          <div className="fx-value-grid"><article className="fx-value-card"><span>YOUR PROJECTED REVENUE</span><b>{compact(model.revenue)}</b><small>{dirt ? "New + follow-on jobs" : "Modeled enrollment value"}</small><div className="fx-value-line"/></article><article className="fx-value-card primary"><span>YOUR EST. CAMPAIGN PROFIT</span><b className={model.contribution < 0 ? "negative" : ""}>{compact(model.contribution)}</b><small>After delivery and campaign costs</small><div className="fx-value-line"/></article><article className="fx-value-card"><span>YOUR MODELED ROI</span><b className={model.roi !== null && model.roi < 0 ? "negative" : ""}>{model.roi === null ? "—" : Math.round(model.roi) + "%"}</b><small>Estimated gain / your investment</small><div className="fx-value-line"/></article></div>
          <div className="fx-flow">{[["01",costLabel,money(model.acquisitionCost)],["02",dirt ? "NEW CUSTOMERS" : "ENROLLMENTS",model.units],["03",dirt ? "FOLLOW-ON JOBS" : "REMAINING SEATS",dirt ? model.totalJobs - model.units : Math.max(0,input.capacity-model.units)],["04",dirt ? "VALUE PER JOB" : "VALUE PER ENROLLMENT",money(input.ticket)]].map(([n,label,value]) => <div className="fx-flow-node" key={String(n)}><span>{n}</span><b>{value}</b><small>{label}</small></div>)}</div>
        </> : <div className={`fx-proof-feature tone-${proof.color}`}><div className="fx-proof-crown"><Factory size={19}/><span>HISTORICAL TEAM EXPERIENCE</span><span className="fx-proof-tag">CLIENT-REPORTED</span></div><p className="fx-kicker">{proof.industry}</p><strong className="fx-proof-number">{proof.value}</strong><h2>{proof.unit}</h2><div className="fx-proof-signal"><TrendingUp size={20}/>{proof.signal}</div><p className="fx-proof-detail">{proof.detail}</p><div className="fx-proof-spectrum" aria-hidden="true">{Array.from({length:16},(_,i) => <i key={i} style={{height:`${18+((i*17)%83)}%`,animationDelay:`${i*.08}s`}}/>)}</div><p className="fx-proof-note">Historical personal/team experience in its original context. Individual results are not a future performance promise.</p></div>}
        <div className="fx-evidence-strip">{tab === "proof" ? <span><ShieldCheck size={13}/> HISTORICAL RESULTS · ANONYMOUS INDUSTRIES</span> : data.clientMetrics[industry].cpa !== null ? <><span><ShieldCheck size={13}/> OBSERVED INDUSTRY RESULT</span><b>{dirt ? "Cost per job" : "Cost per acquisition"}: {money(data.clientMetrics[industry].cpa)}</b><small>{data.asOf ? new Date(data.asOf).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"America/Chicago"}) : ""}</small></> : <span><TrendingUp size={13}/> {model.units < input.targetUnits ? "Scenario limited to your available capacity." : "Explore the possibilities using your business numbers."}</span>}</div>
      </section>
      <aside className="fx-right"><div className="fx-section-label">{tab === "forecast" ? "BUILD YOUR SCENARIO" : "EXPLORE THE RESULTS"}<span>{tab === "forecast" ? "YOUR BUSINESS" : "BY INDUSTRY"}</span></div>
        {tab === "forecast" ? <div className="fx-panel fx-controls"><div className="fx-control-heading"><Boxes size={18}/><span>Your numbers. Your next step.</span><button onClick={() => setInputs(x => ({ ...x, [industry]: DEFAULTS[industry] }))}>RESET</button></div>
          <Slider label={dirt ? "New customer jobs" : "Enrollment goal"} value={input.targetUnits} min={0} max={100} onChange={n => put("targetUnits",n)}/>
          <Slider label={dirt ? "Average job value" : "Value per enrollment"} value={input.ticket} min={500} max={20000} step={100} prefix="$" onChange={n => put("ticket",n)}/>
          <Slider label="Your margin before marketing" value={input.margin} min={5} max={80} suffix="%" onChange={n => put("margin",n)}/>
          <Slider label="Your total campaign investment" value={input.investment} min={dirt ? 7000 : 0} max={30000} step={100} prefix="$" onChange={n => put("investment",n)}/>
          {dirt && <Slider label="Follow-on jobs · same customers" value={input.repeat} min={0} max={24} onChange={n => put("repeat",n)}/>}
          <Slider label={dirt ? "90-day job capacity" : "Available cohort seats"} value={input.capacity} min={1} max={200} onChange={n => put("capacity",n)}/>
          {dirt && <div className="fx-fixed-fee"><span>Contractor service package</span><b>$7,000</b><small>16-first-job objective · creative included</small></div>}
          <p className="fx-input-note">Use the total you expect to invest in services and advertising. Values are scenario inputs.</p>
          <div className="fx-break-even"><BookOpen size={15}/><span>Modeled break-even: <b>{count(model.breakEven)} {unit}</b></span></div>
        </div> : <div className="fx-proof-list">{PROOF.map((p,i) => <button key={p.id} className={selectedProof===i?"active":""} onClick={()=>setSelectedProof(i)}><span>{String(i+1).padStart(2,"0")}</span><div><b>{p.industry}</b><small>{p.value} · {p.unit}</small></div><ArrowUpRight size={14}/></button>)}</div>}
      </aside>
    </main>
    <footer className="fx-footer"><span><ShieldCheck size={12}/> THE LEADFLOW PRO · GROWTH SHOWCASE</span><p>{tab === "forecast" ? "Illustrative outcomes using your assumptions. Other overhead and tax excluded. Actual results vary." : "Historical, client-reported experience. Original claim context preserved."}</p></footer>
    {leaving && <div className="fx-leave"><div><ShieldCheck size={30}/><h2>Return to the private workspace?</h2><p>Stop recording before leaving. The normal workspace contains private client information.</p><button onClick={()=>setLeaving(false)}>Stay in showcase</button><a href="/admin/overview">Return to workspace</a></div></div>}
  </div>;
}
