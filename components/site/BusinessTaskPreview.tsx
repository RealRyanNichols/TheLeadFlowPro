"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  GraduationCap,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";
import styles from "./BusinessTaskPreview.module.css";

const tasks = [
  {
    id: "follow-up",
    label: "Follow up",
    hint: "Find the words to reply",
    icon: MessageCircle,
    title: "Turn an unanswered inquiry into a reply you can review.",
    before: "An inquiry is sitting in your inbox.",
    detail:
      "They asked about your service. You meant to answer after the next job.",
    questions: ["Who replies?", "What happens next?"],
    result: "A clear answer. One next step.",
    benefit: "Start with words you can edit instead of a blank screen.",
    checks: [
      "Acknowledges the inquiry",
      "Asks what matters",
      "Makes the next step clear",
    ],
    cta: "Help me improve follow-up",
    href: "/services",
    note: "See how we can help you build a more consistent response process.",
  },
  {
    id: "get-found",
    label: "Get found",
    hint: "Make your offer clear",
    icon: Search,
    title: "Give a visitor enough clarity to take the next step.",
    before: "Someone reaches your page and still has questions.",
    detail: "What do you do? Where do you work? How can they ask for help?",
    questions: ["What is the offer?", "Where do I start?"],
    result: "A page that explains the offer.",
    benefit: "Help a visitor understand whether your business is a fit.",
    checks: [
      "Names the service",
      "Shows the location",
      "Offers a clear way to ask",
    ],
    cta: "Explore the free website program",
    href: "/free-build",
    note: "Applications are reviewed for fit and scope.",
  },
  {
    id: "get-organized",
    label: "Get organized",
    hint: "Give the work a next step",
    icon: ClipboardList,
    title: "Give the work a place, a person, and a next step.",
    before: "Your next three jobs are in three different places.",
    detail:
      "A message, a scrap of paper, and something you promised to remember.",
    questions: ["What is first?", "Who owns it?"],
    result: "A short plan you can actually use.",
    benefit: "See the work in one place, then adjust it to your day.",
    checks: [
      "Keeps the list short",
      "Names the next action",
      "Makes ownership visible",
    ],
    cta: "Find a tool for my task",
    href: "/tools",
    note: "Choose a useful template or calculator and work with your own details.",
  },
] as const;

type TaskId = (typeof tasks)[number]["id"];

function FinishedExample({ task }: { task: TaskId }) {
  if (task === "follow-up") {
    return (
      <div className={styles.message}>
        <div className={styles.outputLabel}>
          <MessageCircle size={17} aria-hidden="true" /> Reply draft
        </div>
        <p>Thanks for reaching out.</p>
        <p>
          Tell me what you need help with and when you would like to get
          started. I will review the details and explain the next step.
        </p>
        <div className={styles.reviewNote}>
          <span aria-hidden="true" /> Ready for your review
        </div>
      </div>
    );
  }

  if (task === "get-found") {
    return (
      <div className={styles.website}>
        <div className={styles.websiteTop}>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" /> <span>Example website card</span>
        </div>
        <div className={styles.websiteBody}>
          <span className={styles.location}>
            <MapPin size={14} aria-hidden="true" /> Home repairs in Longview
          </span>
          <p className={styles.websiteHeadline}>
            Small repairs.
            <br />
            Clear next steps.
          </p>
          <p>
            Tell us what needs fixing. We will review the job, confirm whether
            it fits, and explain what happens next.
          </p>
          <span className={styles.sampleAction}>
            Request a quote <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checklist}>
      <div className={styles.outputLabel}>
        <ClipboardList size={17} aria-hidden="true" /> Tomorrow&apos;s plan
      </div>
      <ol>
        <li>
          <span className={styles.checkbox} aria-hidden="true" />
          <div>
            <strong>Review new inquiries</strong>
            <span>Choose who replies to each one.</span>
          </div>
          <span className={styles.firstTag}>First</span>
        </li>
        <li>
          <span className={styles.checkbox} aria-hidden="true" />
          <div>
            <strong>Prepare the next quote</strong>
            <span>Gather the details before pricing.</span>
          </div>
        </li>
        <li>
          <span className={styles.checkbox} aria-hidden="true" />
          <div>
            <strong>Close the loose ends</strong>
            <span>Give each open item a next action.</span>
          </div>
        </li>
      </ol>
    </div>
  );
}

export default function BusinessTaskPreview() {
  const [selected, setSelected] = useState<TaskId>("follow-up");
  const id = useId();
  const task = tasks.find((item) => item.id === selected) ?? tasks[0];
  const panelId = `${id}-preview`;

  return (
    <section
      className={styles.section}
      id="see-it-work"
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>A useful place to start</span>
        <h2 id={`${id}-title`}>See what a better workday could look like.</h2>
        <p>
          Pick one task. See a useful example. Choose the next step that fits
          your business.
        </p>
      </div>

      <div
        className={styles.switcher}
        role="group"
        aria-label="Choose a business task to preview"
      >
        {tasks.map(({ id: taskId, label, hint, icon: Icon }) => (
          <button
            key={taskId}
            id={`${id}-${taskId}`}
            type="button"
            aria-pressed={selected === taskId}
            aria-controls={panelId}
            onClick={() => setSelected(taskId)}
            className={styles.taskButton}
          >
            <span className={styles.taskIcon}>
              <Icon size={21} aria-hidden="true" />
            </span>
            <span>
              <strong>{label}</strong>
              <span className={styles.taskHint}>{hint}</span>
            </span>
            <span className={styles.selectionMark} aria-hidden="true">
              <Check size={14} />
            </span>
          </button>
        ))}
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {task.label}: {task.result}
      </p>
      <div
        className={styles.preview}
        id={panelId}
        role="region"
        aria-labelledby={`${id}-${selected}`}
      >
        <div className={styles.previewTop}>
          <ol className={styles.steps} aria-label="How to use these examples">
            <li>
              <span>1</span> Pick a task
            </li>
            <li>
              <span>2</span> See the example
            </li>
            <li>
              <span>3</span> Try a next step
            </li>
          </ol>
          <span className={styles.exampleTag}>Practice example</span>
        </div>

        <div className={styles.story} key={selected}>
          <div className={styles.before}>
            <span className={styles.smallLabel}>The everyday problem</span>
            <h3>{task.title}</h3>
            <div className={styles.beforeNote}>
              <strong>{task.before}</strong>
              <p>{task.detail}</p>
              <div className={styles.questions}>
                {task.questions.map((question) => (
                  <span key={question}>{question}</span>
                ))}
              </div>
            </div>
            <div className={styles.direction}>
              <ArrowRight size={18} aria-hidden="true" /> Here is a useful first
              version
            </div>
          </div>

          <div className={styles.after}>
            <div className={styles.afterHeading}>
              <span className={styles.smallLabel}>
                Something you can work with
              </span>
              <h4>{task.result}</h4>
            </div>
            <FinishedExample task={selected} />
            <ul className={styles.checks}>
              {task.checks.map((check) => (
                <li key={check}>
                  <Check size={15} aria-hidden="true" /> {check}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.nextStep}>
          <div>
            <p>{task.benefit}</p>
            <span>{task.note}</span>
          </div>
          <Link className={styles.primaryLink} href={task.href}>
            {task.cta}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className={styles.learning}>
        <span>
          <GraduationCap size={19} aria-hidden="true" /> Want to learn how to do
          this yourself?
        </span>
        <Link href="/chatgpt/free">
          Try a free lesson <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
