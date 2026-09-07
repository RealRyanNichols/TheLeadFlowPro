import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import styles from "./BusinessTaskPreview.module.css";

const choices = [
  {
    title: "I need a better website.",
    body: "Show what you do. Give customers a way to reach you.",
    image: "/images/academy/cards/website-conversion-system.svg",
    alt: "A business website connects a visitor to a clear inquiry form.",
    label: "See the free website offer",
    href: "/free-build",
    note: "Five pages. See what is included.",
    color: "blue",
  },
  {
    title: "I'm missing calls and leads.",
    body: "See what missed calls could be costing your business.",
    image: "/tools-art/card/missed-call-calculator.svg",
    alt: "Missed calls on a phone beside a business owner at work.",
    label: "Check my missed calls",
    href: "/tools/missed-call-calculator",
    note: "Free calculator. Use your own numbers.",
    color: "red",
  },
  {
    title: "I want to learn ChatGPT.",
    body: "Start with one useful task. Follow a lesson at your own pace.",
    image: "/images/academy/cards/chatgpt-operator.svg",
    alt: "A ChatGPT workbench with a prompt and a finished business document.",
    label: "Start a free lesson",
    href: "/chatgpt/free",
    note: "No experience needed.",
    color: "blue",
  },
] as const;

export default function BusinessTaskPreview() {
  return (
    <section
      className={styles.section}
      id="see-it-work"
      aria-labelledby="business-help-title"
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>Start with what you need</span>
        <h2 id="business-help-title">What&apos;s getting in your way?</h2>
        <p>Choose one. We&apos;ll help with that first.</p>
      </div>
      <div className={styles.choices}>
        {choices.map((choice) => (
          <Link
            key={choice.href}
            href={choice.href}
            className={styles.card}
            data-color={choice.color}
          >
            <div className={styles.art}>
              <Image
                src={choice.image}
                alt={choice.alt}
                width={640}
                height={400}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className={styles.copy}>
              <h3>{choice.title}</h3>
              <p>{choice.body}</p>
              <span className={styles.action}>
                {choice.label}
                <ArrowRight size={19} aria-hidden="true" />
              </span>
              <small>{choice.note}</small>
            </div>
          </Link>
        ))}
      </div>
      <p className={styles.help}>
        Not sure?{" "}
        <a href="tel:+19035008898">
          <Phone size={16} aria-hidden="true" /> Talk to Ryan: (903) 500-8898
        </a>
      </p>
    </section>
  );
}
