import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, GraduationCap, MessageCircle, Phone } from "lucide-react";
import ConsultationForm from "@/components/site/ConsultationForm";
import { BUSINESS } from "@/lib/site/business";
import { PREMIER_COMMON_OWNERSHIP } from "@/lib/site/claims";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import styles from "./dental-partners.module.css";

export const metadata: Metadata = withPublicPageMetadata("/dental-partners", {
  title: "Dental Practice Marketing & Local Partnerships | The LeadFlow Pro",
  description: "Meet Amanda Williams. See the marketing and connected systems behind Premier Dental Academy of Longview, then talk about growth, dental referral opportunities, and graduate hiring for your practice.",
  openGraph: { title: "More patients. Stronger practice.", description: "Marketing, follow-up, and local dental connections. Built by the team behind Premier Dental Academy of Longview’s connected business system." },
});

const TEXT_AMANDA = `${BUSINESS.phone.sms}?&body=${encodeURIComponent("Hi LeadFlow team, I received Amanda’s dental practice flyer. I would like to talk about marketing and partnership opportunities for our office. ")}`;

const SERVICES = [
  ["Get seen by the right people", "Advertising, social content, and a clear local website built around the services and patients your practice can serve."],
  ["Give every inquiry a next step", "Connect calls, texts, and website forms to a clear response and appointment path for your front desk."],
  ["Follow up while the interest is there", "Build a practical follow-up process so unanswered questions and missed calls do not sit forgotten."],
  ["Know what is turning into business", "Measure actual inquiries, appointments, and recorded payments with your team, then improve the work from those numbers."],
];

export default function DentalPartnersPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="dental-title">
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.kicker}>For Longview & East Texas dental practices</p>
              <h1 id="dental-title">More patients.<br /><em>Stronger practice.</em></h1>
              <p className={styles.lead}>Your office needs more than attention. It needs a clear path from the first question to the appointment and the follow-up.</p>
              <p>We built that connected business system inside Premier Dental Academy of Longview. Let’s talk about what your practice needs next.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href="#talk">Talk about your practice <ArrowRight size={19} aria-hidden="true" /></a>
                <a className={styles.secondary} href={TEXT_AMANDA}><MessageCircle size={19} aria-hidden="true" /> Text our team</a>
              </div>
              <p className={styles.heroNote}>Marketing • Follow-up • Dental connections • Graduate hiring</p>
            </div>
            <figure className={styles.portrait}>
              <Image src="/images/premier/amanda-williams.jpg" alt="Amanda Williams, owner and director of Premier Dental Academy of Longview and co-owner of The LeadFlow Pro" width={720} height={850} priority sizes="(max-width: 800px) 90vw, 40vw" />
              <figcaption><strong>Meet Amanda Williams</strong><span>Premier Dental Academy owner & director<br />The LeadFlow Pro co-owner</span></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="system-title">
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.kicker}>The work behind the business</p><h2 id="system-title">Connect your marketing<br />to your front desk.</h2></div>
            <p>Your ads, website, phone, and follow-up should work together. We scope the work around your services, team capacity, and the next action you want a patient to take.</p>
          </div>
          <div className={styles.serviceList}>
            {SERVICES.map(([title, detail], index) => <article className={styles.service} key={title}><span className={styles.number}>0{index + 1}</span><div><h3>{title}</h3><p>{detail}</p></div><Check size={22} aria-hidden="true" /></article>)}
          </div>
          <p className={styles.note}>Your practice keeps its accounts and leads. Deliverables, advertising budget, responsibilities, and pricing are agreed in writing before work starts. No patient volume or financial result is guaranteed.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.proof}`} aria-labelledby="premier-title">
        <div className={styles.shell}>
          <div className={styles.proofGrid}>
            <div>
              <p className={styles.kicker}>Built inside our own business</p>
              <h2 id="premier-title">See the system<br />behind Premier.</h2>
              <p>Amanda leads the school. Premier’s instructors teach and support the students. Ryan Nichols and The LeadFlow Pro built the website, enrollment path, tools, lead capture, and connected back office.</p>
              <ul className={styles.checkList}>
                <li><Check size={19} aria-hidden="true" /> A website that answers real questions</li>
                <li><Check size={19} aria-hidden="true" /> Connected applications and enrollment steps</li>
                <li><Check size={19} aria-hidden="true" /> Follow-up with the conversation in view</li>
                <li><Check size={19} aria-hidden="true" /> Learning tools and an operating back office</li>
              </ul>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/premier-system">Explore the Premier build <ArrowRight size={19} aria-hidden="true" /></Link>
                <Link className={styles.textLink} href="/results">See the working businesses <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className={styles.schoolPhotos}>
              <Image src="/images/premier/premier-students.jpg" alt="Premier Dental Academy of Longview students training at the school" width={900} height={600} sizes="(max-width: 800px) 90vw, 45vw" />
              <Image src="/images/premier/premier-classroom.jpg" alt="The training classroom at Premier Dental Academy of Longview" width={900} height={600} sizes="(max-width: 800px) 90vw, 45vw" />
            </div>
          </div>
          <p className={styles.note}>{PREMIER_COMMON_OWNERSHIP} Premier is a dental assistant school. It does not provide dental treatment.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="connections-title">
        <div className={styles.shell}>
          <p className={styles.kicker}>A local conversation worth having</p>
          <h2 id="connections-title">Marketing. Connections.<br />People for your team.</h2>
          <div className={styles.partnerGrid}>
            <article className={styles.partner}>
              <MessageCircle size={31} aria-hidden="true" /><h3>Ask about dental referral opportunities</h3>
              <p>When people contact Premier seeking dental care, we want clear local referral options. We would like to talk with practices about a consent-based next step when someone needs a dentist.</p>
              <p>Tell Amanda which services you offer, whether you are accepting new patients, and how your team handles insurance and self-pay questions.</p>
              <a href={TEXT_AMANDA} className={styles.textLink}>Discuss referral opportunities <ArrowRight size={17} aria-hidden="true" /></a>
              <p className={styles.note}>Each practice confirms clinical suitability, availability, coverage, and payment arrangements. Inquiry volume, patient readiness, and referrals are not guaranteed.</p>
            </article>
            <article className={styles.partner}>
              <GraduationCap size={31} aria-hidden="true" /><h3>Meet dental assisting graduates</h3>
              <p>Amanda also wants to connect Premier graduates with offices that are hiring. Tell us what your team needs and what experience the role requires.</p>
              <p>Explore the school’s training and talk about opportunities to meet prospective team members.</p>
              <a href={TEXT_AMANDA} className={styles.textLink}>Talk about your hiring needs <ArrowRight size={17} aria-hidden="true" /></a>
              <p className={styles.note}>Individual credentials, registration, skills, and fit are confirmed before hire. Employment and placement are not guaranteed.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.contact}`} id="talk" aria-labelledby="dental-contact-title">
        <div className={styles.shell}>
          <div className={styles.contactGrid}>
            <div>
              <p className={styles.kicker}>Start with your practice</p>
              <h2 id="dental-contact-title">Let’s find<br />your next move.</h2>
              <p>More new-patient conversations? Better follow-up? An easier appointment path? A new dental assistant? Tell us where your office needs help.</p>
              <p>Request a free 30-minute consultation, or call or text and mention Amanda’s dental practice flyer.</p>
              <div className={styles.contactLinks}>
                <a href={BUSINESS.phone.tel}><Phone size={21} aria-hidden="true" /> {BUSINESS.phone.display}</a>
                <a href={TEXT_AMANDA}><MessageCircle size={21} aria-hidden="true" /> Text us about Amanda’s visit</a>
              </div>
              <p className={styles.meeting}><CalendarDays size={19} aria-hidden="true" /> One conversation. A clear scope. A practical next step.</p>
            </div>
            <div className={styles.form}><ConsultationForm placement="dental-partners-flyer" labelledBy="dental-contact-title" /></div>
          </div>
        </div>
      </section>
    </main>
  );
}
