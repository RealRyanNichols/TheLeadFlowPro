import { ArrowRight, CalendarDays, Check, FileText, Globe2, Inbox, Layers3, LockKeyhole, MessageSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./CapabilityWorkflow.module.css";

type Layout = "brief" | "page" | "funnel" | "board" | "search" | "record" | "conversation" | "calendar" | "receipt" | "portal" | "learning" | "queue" | "permissions" | "rules" | "assets" | "report";
type Example = {
  layout: Layout;
  title: string;
  input: string;
  result: string;
  items: [string, string][];
};

const EXAMPLES: Record<string, Example> = {
  positioning: {
    layout: "brief", title: "A message your customer recognizes", input: "Start with your buyer, their problem and your actual work.", result: "One clear sentence your team can use everywhere.",
    items: [["Who", "Busy local homeowners"], ["What they need", "A clean driveway without losing a Saturday"], ["Your promise", "We clean your driveway. You get your weekend back."]],
  },
  offers: {
    layout: "receipt", title: "An offer with no missing pieces", input: "A service you can deliver, with an agreed scope and price.", result: "The buyer knows what is included before saying yes.",
    items: [["Included", "The work, deliverables and timeline"], ["Price & terms", "Written total and payment schedule"], ["Your next step", "Approve the scope and open checkout"]],
  },
  "public-website": {
    layout: "page", title: "Your business, understood in one visit", input: "A customer arrives from search, a referral or an ad.", result: "They can understand your service and ask for a quote.",
    items: [["Your business", "Services · Our work · Contact"], ["See what we can do for your home", "A clear service, a real work example and the area you serve."], ["Get my quote", "Name, contact details and the work needed"]],
  },
  "landing-pages": {
    layout: "page", title: "The ad and the page keep the same promise", input: "Campaign: a quote for one specific service.", result: "One focused inquiry, with its campaign source attached.",
    items: [["The offer you clicked", "Same service. Same promise."], ["Tell us what you need cleaned", "A short explanation, relevant proof and clear service-area details."], ["Request this service", "One form. One next action."]],
  },
  funnels: {
    layout: "funnel", title: "Answer the next question at each step", input: "Someone is interested, but has not decided yet.", result: "A qualified buyer reaches the right next step.",
    items: [["Is this for me?", "Offer and useful proof"], ["Can you help with my job?", "Location, need and fit"], ["What happens next?", "Book, request a quote or pay"]],
  },
  content: {
    layout: "board", title: "One useful answer, ready to publish", input: "Buyer question: What should I check before getting a quote?", result: "An approved article, short post and email with a shared next step.",
    items: [["Research", "Check the facts and collect a real example"], ["Create", "Write the answer and prepare each format"], ["Approve", "Review, publish and record the live links"]],
  },
  seo: {
    layout: "search", title: "Give a real search a useful answer", input: "Example search: driveway cleaning in Longview.", result: "A relevant service page people and search engines can understand.",
    items: [["Driveway cleaning in Longview", "The service and location match the search."], ["What is included?", "Scope, work examples and common questions"], ["Ask for a quote", "An obvious action after the answer"]],
  },
  ads: {
    layout: "report", title: "Trace the campaign beyond the click", input: "An approved offer, audience, creative and spending limit.", result: "Judge the campaign by real inquiries and verified outcomes.",
    items: [["Creative", "The promise the person saw"], ["Landing page", "The action they were asked to take"], ["Lead & outcome", "Saved inquiry, owner and eventual result"]],
  },
  "lead-capture": {
    layout: "record", title: "A form becomes a lead someone owns", input: "A customer sends their name, phone, email and request.", result: "The inquiry is saved, acknowledged and assigned.",
    items: [["Source", "Website quote form"], ["Request", "Service needed and preferred contact method"], ["Next action", "Assigned owner reviews and replies"]],
  },
  "lead-scoring": {
    layout: "queue", title: "See why this inquiry comes first", input: "The customer's stated need, location and timing.", result: "Your team can explain the priority and change it when needed.",
    items: [["Contact first", "Fits your service area and needs help soon"], ["Clarify fit", "Right service, but the location is missing"], ["Follow up later", "Researching now; timing is not decided"]],
  },
  crm: {
    layout: "record", title: "The whole conversation, in one place", input: "The same customer calls after filling in a form.", result: "The next person can pick up the conversation without starting over.",
    items: [["Customer history", "Original request and where it came from"], ["Latest update", "Called to ask about availability"], ["Owner & next task", "Confirm the job details and send the quote"]],
  },
  pipeline: {
    layout: "board", title: "Every opportunity has a next move", input: "A new inquiry enters your sales process.", result: "You can see where work is waiting and who needs to act.",
    items: [["New inquiry", "Confirm fit · Sales owner"], ["Quote sent", "Answer questions · Follow-up date"], ["Decision", "Record won or lost · Start the next task"]],
  },
  calls: {
    layout: "conversation", title: "A missed call still gets a next step", input: "A caller reaches the business while the team is on a job.", result: "The call and callback task stay attached to the customer.",
    items: [["Incoming call", "The business line rings; nobody answers."], ["Call record", "Time, source and missed-call status are saved."], ["Assigned callback", "A team member returns the call and records the outcome."]],
  },
  texts: {
    layout: "conversation", title: "Replies with context and permission", input: "A customer agrees to receive the relevant business texts.", result: "Replies and opt-outs update the same customer history.",
    items: [["Business", "Your quote is ready. Is there anything you want us to clarify?"], ["Customer", "Can you include the side walkway?"], ["Next move", "Update the quote; keep the reply with the request."]],
  },
  email: {
    layout: "conversation", title: "The promised information actually gets sent", input: "A customer requests a guide or agrees to email follow-up.", result: "Your team can distinguish sent, delivered, replied and failed.",
    items: [["Message", "Here is the guide you requested."], ["Delivery record", "Provider accepted it, or flagged a failure."], ["Reply handling", "A question creates an owner task; an opt-out stops marketing."]],
  },
  booking: {
    layout: "calendar", title: "Choose a time that is really available", input: "A qualified customer needs a conversation with the right person.", result: "A confirmed appointment, reminders and a way to reschedule.",
    items: [["Available", "Tuesday · Morning"], ["Chosen time", "Thursday · Afternoon"], ["Calendar updated", "Assigned host + appointment details"]],
  },
  payments: {
    layout: "receipt", title: "A verified payment starts the handoff", input: "The customer approves the order and enters secure checkout.", result: "A recorded purchase, a receipt and the correct delivery task.",
    items: [["Order", "Approved item, price and payment terms"], ["Payment status", "Confirmed by the payment provider"], ["Fulfillment", "Send receipt and open the purchased work or access"]],
  },
  "customer-portals": {
    layout: "portal", title: "One place to check the work", input: "A customer signs in to their own account.", result: "They know what is ready and what you need from them.",
    items: [["My project", "Current stage and next milestone"], ["Ready for review", "The latest deliverable and approval request"], ["My messages", "Questions and replies attached to the work"]],
  },
  "member-student-areas": {
    layout: "learning", title: "The right access for the person enrolled", input: "An enrollment or membership has been confirmed.", result: "The member can continue from their own saved progress.",
    items: [["My access", "Enrolled program and included resources"], ["Continue learning", "Next lesson and saved progress"], ["Get help", "Support connected to the member account"]],
  },
  "admin-dashboards": {
    layout: "queue", title: "Show what needs attention today", input: "Live records surface an exception, deadline or approval.", result: "An owner can take action and return to the underlying record.",
    items: [["Needs a reply", "An inquiry has no next action"], ["Needs approval", "A finished draft is waiting on review"], ["Needs a check", "A delivery failed and needs attention"]],
  },
  "team-workflows": {
    layout: "board", title: "Pass the work without losing the details", input: "A customer approves a new project.", result: "Each person knows their responsibility and what counts as finished.",
    items: [["Sales → Delivery", "Approved scope and customer requirements"], ["Delivery → Review", "Finished work and acceptance checklist"], ["Review → Launch", "Approval recorded; launch owner assigned"]],
  },
  permissions: {
    layout: "permissions", title: "The right view for each person", input: "Assign a role before granting access.", result: "Private customer work stays inside its intended account.",
    items: [["Customer", "Their project only"], ["Team member", "Assigned work"], ["Owner", "Business controls"]],
  },
  courses: {
    layout: "learning", title: "Turn a lesson into something the learner can do", input: "A learner opens the course they can access.", result: "Progress reflects learning and work, not a pile of downloaded videos.",
    items: [["Learn", "One focused lesson"], ["Use it", "Complete the practical exercise"], ["Check & continue", "Assess the work and unlock the next step"]],
  },
  archives: {
    layout: "search", title: "Find the record you need again", input: "Search a topic, date, document type or source.", result: "A reusable record with its history and permissions intact.",
    items: [["Project handoff checklist", "Document · Dated version · Approved"], ["Related records", "Source files and connected project notes"], ["Open the original", "View the source or export the permitted record"]],
  },
  automation: {
    layout: "rules", title: "A reminder that knows when to stop", input: "A quote has been sent and a follow-up time is reached.", result: "Routine follow-up happens without ignoring a customer's response.",
    items: [["Check", "Has the customer already replied?"], ["If yes", "Stop the reminder and alert the owner."], ["If no", "Use the approved follow-up; log success or failure."]],
  },
  "ai-agents": {
    layout: "rules", title: "Useful work inside clear limits", input: "Approved source material and a narrow research task.", result: "A reviewable draft with sources and a record of the work.",
    items: [["Allowed", "Read approved sources and prepare a draft"], ["Human review", "Check facts, missing information and the proposed next move"], ["Approval needed", "Publishing, outreach or spending requires the agreed permission"]],
  },
  "your-code": {
    layout: "assets", title: "A working handoff, not just a screenshot", input: "Your business controls the project repository.", result: "A new developer has what they need to maintain the system.",
    items: [["Source files", "Pages, components and business rules"], ["Change history", "What changed and how to restore it"], ["Runbook", "Build, deployment and maintenance instructions"]],
  },
  "your-database": {
    layout: "record", title: "Your business records stay connected", input: "A business-controlled database with defined access.", result: "Customer, order and delivery records can be backed up and exported.",
    items: [["Customer", "Contact record and communication permissions"], ["Related order", "Purchased work and verified payment status"], ["Related project", "Deliverables, owner and current status"]],
  },
  "your-domains": {
    layout: "assets", title: "Keep the keys to your internet address", input: "The domain is registered in your business account.", result: "Your address can keep working when your provider changes.",
    items: [["Registrar", "Business owner and recovery contact"], ["Connections", "Website and email destination records"], ["Renewal", "Expiry date, billing owner and reminders"]],
  },
  "vendor-accounts": {
    layout: "permissions", title: "The business owns it. Helpers get a role.", input: "List each service, its business owner and invited collaborators.", result: "Change a contractor without losing an account or its history.",
    items: [["Business", "Owner and billing"], ["Team", "Assigned operations"], ["Contractor", "Limited invitation"]],
  },
  "your-analytics": {
    layout: "report", title: "Follow the source to the real outcome", input: "Business-controlled events with private details excluded.", result: "See which sources produce useful inquiries and actual outcomes.",
    items: [["Source", "Search, referral, ad or direct visit"], ["Action", "A submitted form or connected call"], ["Outcome", "Qualified inquiry or verified purchase"]],
  },
  "customer-relationships": {
    layout: "record", title: "The relationship survives a channel change", input: "A customer contacts you through an outside platform.", result: "Your company retains the permitted history and the next action.",
    items: [["Customer record", "Known contact and communication preferences"], ["Relationship history", "Conversations, purchases and service delivered"], ["Stay in control", "Documented consent, export and retention rules"]],
  },
  portability: {
    layout: "assets", title: "Could another provider pick this up?", input: "A planned move, recovery or vendor handoff.", result: "Ownership is backed by a usable export and a tested recovery path.",
    items: [["Export", "Source files, data and permitted assets"], ["Restore", "Required accounts, settings and backup steps"], ["Verify", "Open the site, check access and test the core workflow"]],
  },
};

export default function CapabilityWorkflow({ id }: { id: string }) {
  const example = EXAMPLES[id];
  if (!example) return null;
  const { layout, items } = example;
  const detailCards = items.map(([label, detail], i) => (
    <div className={styles.item} key={label}>
      <span className={styles.step}>{String(i + 1).padStart(2, "0")}</span>
      <div><strong>{label}</strong><p>{detail}</p></div>
    </div>
  ));

  return (
    <div className={styles.canvas} aria-label={`${example.title}. Illustrative workflow.`}>
      <div className={styles.heading}><span><Layers3 aria-hidden="true" />HOW IT WORKS</span><small>Illustrative example</small></div>
      <h4 className={styles.title}>{example.title}</h4>
      <p className={styles.input}>{example.input}</p>
      <div className={`${styles.workspace} ${styles[layout]}`}>
        {layout === "brief" && <><div className={styles.briefInputs}>{detailCards.slice(0, 2)}</div><blockquote>{items[2][1]}</blockquote><span className={styles.note}>Your promise, in the customer's language</span></>}
        {layout === "page" && <><div className={styles.browserBar}><span /><span /><span /><small>Example page</small></div><div className={styles.pageNav}><Globe2 aria-hidden="true" /><strong>{items[0][0]}</strong><span>{items[0][1]}</span></div><div className={styles.pageHero}><span className={styles.sampleTag}>YOUR SERVICE</span><strong>{items[1][0]}</strong><p>{items[1][1]}</p><div className={styles.buttonSample}>{items[2][0]}<ArrowRight aria-hidden="true" /></div><small>{items[2][1]}</small></div></>}
        {layout === "funnel" && items.map(([label, detail], i) => <div className={styles.funnelStep} key={label} style={{ "--inset": `${i * 7}%` } as CSSProperties}><span>{i + 1}</span><div><strong>{label}</strong><p>{detail}</p></div></div>)}
        {layout === "board" && items.map(([label, detail], i) => <div className={styles.column} key={label}><span className={styles.columnLabel}><i />{label}</span><div><FileText aria-hidden="true" /><strong>{detail}</strong><small>{i === 2 ? "Record the outcome" : "Clear owner · Clear next action"}</small></div></div>)}
        {layout === "search" && <><div className={styles.searchBox}><Search aria-hidden="true" /><span>{id === "seo" ? "driveway cleaning in Longview" : "Search records, dates and sources"}</span></div>{items.map(([label, detail], i) => <div className={styles.searchResult} key={label}><small>{id === "seo" ? (i === 0 ? "Relevant service page" : "On the page") : (i === 0 ? "Matching record" : "Inside the archive")}</small><strong>{label}</strong><p>{detail}</p></div>)}</>}
        {layout === "record" && <><div className={styles.recordTitle}><Inbox aria-hidden="true" /><strong>{id === "your-database" ? "Connected business records" : "One customer record"}</strong><span>Example</span></div>{detailCards}</>}
        {layout === "conversation" && <><div className={styles.recordTitle}><MessageSquare aria-hidden="true" /><strong>{id === "calls" ? "Call activity" : id === "texts" ? "Customer conversation" : "Email & delivery history"}</strong></div>{items.map(([label, detail], i) => <div className={`${styles.bubble} ${i === 1 ? styles.reply : ""}`} key={label}><small>{label}</small><p>{detail}</p></div>)}</>}
        {layout === "calendar" && <><div className={styles.recordTitle}><CalendarDays aria-hidden="true" /><strong>Appointment example</strong><span>Choose a time</span></div><div className={styles.slots}>{items.slice(0, 2).map(([label, detail], i) => <div className={i ? styles.selectedSlot : styles.slot} key={label}><span>{label}</span><strong>{detail}</strong>{i ? <Check aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}</div>)}</div><div className={styles.calendarResult}><Check aria-hidden="true" /><div><strong>{items[2][0]}</strong><p>{items[2][1]}</p></div></div></>}
        {layout === "receipt" && <><div className={styles.receiptHead}><ShieldCheck aria-hidden="true" /><span>{id === "payments" ? "Order → Payment → Delivery" : "Your offer at a glance"}</span></div>{items.map(([label, detail]) => <div className={styles.receiptRow} key={label}><span>{label}</span><strong>{detail}</strong></div>)}<div className={styles.receiptFoot}>{id === "payments" ? "Provider confirmation comes before paid access." : "No guessing about what is included."}</div></>}
        {layout === "portal" && <><div className={styles.recordTitle}><LockKeyhole aria-hidden="true" /><strong>Your private project space</strong></div><div className={styles.portalGrid}>{items.map(([label, detail], i) => <div key={label}><span>{i === 0 ? "PROJECT" : i === 1 ? "YOUR NEXT ACTION" : "CONVERSATION"}</span><strong>{label}</strong><p>{detail}</p>{i === 1 && <span className={styles.buttonSample}>Review the work<ArrowRight aria-hidden="true" /></span>}</div>)}</div></>}
        {layout === "learning" && <><div className={styles.recordTitle}><FileText aria-hidden="true" /><strong>{id === "courses" ? "Lesson → Practice → Progress" : "Your member home"}</strong></div>{items.map(([label, detail], i) => <div className={styles.lesson} key={label}><span className={styles.lessonNumber}>{i === 0 ? <Check aria-hidden="true" /> : i + 1}</span><div><strong>{label}</strong><p>{detail}</p></div><small>{i === 0 ? "Start here" : i === 1 ? "Next" : "Continue"}</small></div>)}</>}
        {layout === "queue" && <><div className={styles.recordTitle}><Inbox aria-hidden="true" /><strong>{id === "lead-scoring" ? "Priority with a reason" : "Today's action queue"}</strong></div>{items.map(([label, detail], i) => <div className={styles.queueRow} key={label}><span className={styles.priority}>{i + 1}</span><div><strong>{label}</strong><p>{detail}</p></div><ArrowRight aria-hidden="true" /></div>)}</>}
        {layout === "permissions" && <><div className={styles.recordTitle}><LockKeyhole aria-hidden="true" /><strong>Example access map</strong></div><div className={styles.accessGrid}>{items.map(([label, detail], i) => <div key={label}><span className={styles.roleIcon}>{i === 0 ? <ShieldCheck aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span><strong>{label}</strong><p>{detail}</p><small>{id === "permissions" ? (i === 2 ? "Approve & manage" : "Only the right records") : (i === 0 ? "Keep ownership" : "Revoke when no longer needed")}</small></div>)}</div><p className={styles.accessNote}>Access follows a role, not a shared password.</p></>}
        {layout === "rules" && <><div className={styles.ruleTrigger}><Sparkles aria-hidden="true" /><strong>{items[0][0]}</strong><p>{items[0][1]}</p></div><div className={styles.branches}>{items.slice(1).map(([label, detail]) => <div key={label}><span>{label}</span><strong>{detail}</strong></div>)}</div></>}
        {layout === "assets" && <><div className={styles.recordTitle}><ShieldCheck aria-hidden="true" /><strong>{id === "portability" ? "Handoff checklist" : "In your business account"}</strong></div>{items.map(([label, detail]) => <div className={styles.assetRow} key={label}><FileText aria-hidden="true" /><div><strong>{label}</strong><p>{detail}</p></div><Check aria-hidden="true" /></div>)}</>}
        {layout === "report" && <><div className={styles.recordTitle}><Layers3 aria-hidden="true" /><strong>{id === "ads" ? "Campaign evidence trail" : "Source-to-outcome view"}</strong><span>No invented totals</span></div>{items.map(([label, detail], i) => <div className={styles.reportRow} key={label}><span>{String(i + 1).padStart(2, "0")}</span><div><strong>{label}</strong><p>{detail}</p></div><small>{i === 2 ? "Verify result" : "Keep the link"}</small></div>)}</>}
      </div>
      <div className={styles.outcome}><Check aria-hidden="true" /><p><span>WHAT YOU GET</span>{example.result}</p></div>
    </div>
  );
}
