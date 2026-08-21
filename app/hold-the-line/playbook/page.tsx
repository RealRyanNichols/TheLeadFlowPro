import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

// THE HOLD THE LINE PLAYBOOK. The $47 digital product, delivered by link in
// the fulfillment email from /api/stripe-webhook after checkout.
//
// This is an unlisted delivery page, not a marketing page: it is noindexed,
// out of the sitemap, and linked from nowhere public. The content is the
// approved playbook from Notion (14.1 The Response Playbook, 14.2 Account
// Recovery, 14.3 Build The Record, 14.4 Protect Your Head), published, not
// rewritten. If the product later ships as a PDF, this page is the source.

export const metadata: Metadata = {
  title: "The Hold The Line Playbook | The LeadFlow Pro",
  description:
    "The doctrine, the sorting table, the response library, the never-type list, and the 60-second pre-send check.",
  robots: { index: false, follow: false },
};

const DOCTRINE = [
  {
    rule: "Sort before you swing.",
    body: "Not everyone who disagrees with you is an enemy. There are seven kinds of people in your comments and they get seven different answers. Most accounts die because somebody treated an objection like a threat.",
  },
  {
    rule: "You are not writing to them. You are writing to the fifty people reading.",
    body: "This one reframe prevents almost every crash-out. The person attacking you is not persuadable and does not matter. The silent reader is both.",
  },
  {
    rule: "Concede the true part first.",
    body: "Every reply that works opens by agreeing with whatever is accurate in the attack. It takes their footing out from under them and it makes you the honest one in the thread. You cannot be dragged by something you already admitted.",
  },
  {
    rule: "Answer once. Answer well. Stop.",
    body: "The first reply is for the audience. The second is for your ego. There is no third.",
  },
  {
    rule: "Never go to their profile.",
    body: "The second you start researching the person instead of answering the point, you have changed what the fight is about and you have already lost it. It is also the fastest route to a platform strike, a harassment report, and a letter from somebody's lawyer.",
  },
  {
    rule: "A date beats a paragraph.",
    body: "One calm sentence with a verifiable fact in it does more damage than four hundred angry words. Heat reads as weakness. Specifics read as strength.",
  },
  {
    rule: "Screenshot before you engage.",
    body: "Not to attack with. To protect yourself with. Full thread, URL, timestamp, before anybody edits or deletes.",
  },
  {
    rule: "A threat is not a comment anymore.",
    body: "Violence, your family, your address, somebody showing up. Stop replying immediately. That is a different track. Document, report, involve law enforcement if it is credible. Anything you type becomes their content.",
  },
  {
    rule: "The block is a tool, not a surrender.",
    body: "Correct after you have answered once in public and they came back with nothing new. Wrong as your first move on a business page.",
  },
  {
    rule: "Never delete a critical comment you could have answered.",
    body: "Deleting is a confession. Answering is a demonstration. Delete only for vulgarity, threats, doxxing, or lies about a third party who never signed up for this.",
  },
];

const SORTING = [
  {
    type: "The Objection",
    looks: '"You can do this free with open source." "Too expensive." "AI can\'t really do that."',
    wants: "To be right in public. Often trying to be helpful.",
    move: "Concede the true part, reframe to the real value, respect the do-it-yourself path, close the reader.",
    never: "Treat it as an attack. This is the most valuable comment on the post.",
  },
  {
    type: "The Critic",
    looks: '"I paid somebody like you and got burned." "Your site had a typo." "You never called me back."',
    wants: "To be heard, or to warn other people.",
    move: "Thank them, address the specific thing, fix it in public if they are right, offer a direct line.",
    never: "Get defensive. A complaint you fixed in public is your best testimonial.",
  },
  {
    type: "The Know-It-All",
    looks: 'Corrects your terminology, name-drops tools, "actually it\'s called..."',
    wants: "Status.",
    move: "Hand them the status in one gracious line and move on.",
    never: "Argue technical minutiae in public. You both look small and the reader leaves.",
  },
  {
    type: "The Troll",
    looks: "Repetitive, no substance, escalating, follows you post to post.",
    wants: "A reaction. Any reaction.",
    move: "One clean line aimed at the audience, not at him. Then block.",
    never: "Reply more than once. Every reply is oxygen.",
  },
  {
    type: "The Pile-On",
    looks: "Many accounts at once, same phrasing, coordinated timing.",
    wants: "To make speaking cost more than it is worth.",
    move: "Do not answer them one by one. One pinned statement. Document everything. Limit comments if it does not stop.",
    never: "Try to win thirty arguments simultaneously. Nobody has ever won that.",
  },
  {
    type: "The Lie",
    looks: "A specific false factual claim that damages you.",
    wants: "Varies. Does not matter.",
    move: "Correct it once, with a date or a document. Pin the correction. Leave the lie visible.",
    never: "Delete it when you can disprove it. The correction sitting under the lie is the asset.",
  },
  {
    type: "The Threat",
    looks: 'Violence, your family, your address, "I\'ll see you soon."',
    wants: "To frighten you.",
    move: "Stop replying. Screenshot with URL and timestamp. Report. Law enforcement if credible.",
    never: "Respond at all. Anything you type becomes their content and your liability.",
  },
];

const LIBRARY = [
  {
    situation: 'The "I could do this myself for free" objection',
    reply: [
      "You're right. The tools are free. Every one of them.",
      "So is a table saw.",
      "The tools were never the product. What people pay for is the months somebody already spent finding out which ones break, which ones actually talk to each other, and what to do at 11pm when it stops working.",
      "If you can build it yourself, you should. Seriously. You'll save money and learn more than any course teaches.",
      "The guy running a shop 60 hours a week can't, and doesn't want to. That's who this is for.",
      "Appreciate the heads up.",
    ],
    note: null,
  },
  {
    situation: "The price objection",
    reply: [
      'It is a real number, and I\'d rather say it out loud than hide it behind "contact us for pricing."',
      "Here's the math I'd want if I were you: add up what you pay every month right now for the site, the email tool, the booking tool, the CRM seats, and the review software. Multiply by 12.",
      "If this costs less than that and you own it at the end, it's not expensive. If it costs more, don't buy it.",
    ],
    note: null,
  },
  {
    situation: "The legitimate complaint",
    reply: [
      "You're right, and I'm not going to argue with you about it in the comments.",
      "Here's what happened: [one honest sentence]. Here's what I'm doing about it: [one specific fix, with a date].",
      "If you want to talk to me directly instead of typing, I'm at [number]. I'll pick up.",
    ],
    note: null,
  },
  {
    situation: "The know-it-all correction",
    reply: [
      "Good catch, that is the technical term. Appreciate you putting it in the thread for anybody who wants to go read up on it.",
    ],
    note: 'Then stop. Do not add "but." The word but turns a graceful exit into round two.',
  },
  {
    situation: "The troll, one line then block",
    reply: [
      "This post is about [topic]. If you've got something on that, I'm listening. If not, no hard feelings.",
    ],
    note: "One line. Aimed past him, at the reader. Then block and do not check whether he replied.",
  },
  {
    situation: "The pile-on, one pinned statement",
    reply: [
      "There's a lot of traffic on this post today, so I'm going to say this once, in writing, and then get back to work.",
      "[Two or three sentences of position, facts only, dates where you have them.]",
      "I'm not going to argue it thirty separate times in a comment section. Anyone who wants the actual documents can email me at [address] and I'll send them.",
      "Do not threaten anyone. Do not harass anyone. Do not contact anyone on my behalf. Read it and decide for yourself.",
    ],
    note: null,
  },
  {
    situation: "The specific lie",
    reply: [
      "That is not accurate, and I can show it.",
      "[Fact. Date. Document or link.]",
      "I'm leaving the original comment up so anybody can check it against what I just posted.",
    ],
    note: null,
  },
  {
    situation: "The threat",
    reply: [],
    note: "No public reply. Screenshot the full thread with URL and timestamp, save it somewhere off the platform, report it, and if it is credible, take it to law enforcement. Then stop looking at it.",
  },
];

const NEVER_TYPE = [
  "Anything about their family, their kids, or their spouse",
  "Anything about their appearance, their weight, their intelligence, or their mental health",
  "Any slur. Any of them. Including the ones you would say out loud with your friends. Screenshots do not carry your tone of voice, and they do not expire.",
  'Anything that can be read as physical: "say it to my face," "I know where," "come see me," "you\'d better hope"',
  "Any wish of harm, even as a joke, even with a laughing emoji",
  "Their employer, their school, their address, their phone number, their church, their kids' school",
  "Profanity aimed at a named person. General profanity is survivable on most platforms. Profanity pointed at a specific human being is what gets reported and actioned.",
  "Anything typed inside twenty minutes of the feeling",
];

const SIXTY_SECOND = [
  "Which of the seven types is this? Say it out loud.",
  "Is there anything true in their comment that I can concede first?",
  "Who is my last sentence written to, them or the reader? If it is them, rewrite it.",
  "Would I be fine if this exact reply were screenshotted, cropped, and posted with no context?",
  "Is there a single word in here about their person rather than their point?",
  "Has it been at least twenty minutes since I first read their comment?",
  "Am I about to reply a second time? If yes, do not.",
];

const BANNED_KINDS = [
  {
    called: "Banned, deleted, suspended",
    is: "Account removed or locked.",
    know: "You cannot log in, or you log in to a notice.",
    appeal: "Usually yes, and often on a short clock. Move now.",
  },
  {
    called: "Restricted",
    is: "Account is alive, features are switched off. No posting, no live, no ads.",
    know: "You can log in but specific actions fail or are greyed out.",
    appeal: "Yes.",
  },
  {
    called: "Demonetized",
    is: "Monetization pulled, account otherwise intact.",
    know: "Payouts stop, monetization status reads ineligible.",
    appeal: "Yes. This is the most recoverable of the five.",
  },
  {
    called: 'De-recommended, reduced distribution, "shadowbanned"',
    is: "No formal penalty. You are simply not being pushed to non-followers.",
    know: "Reach collapses, nothing in your account status says why.",
    appeal: "Rarely a formal appeal. You fix the cause, not the ruling.",
  },
  {
    called: "Nothing",
    is: "The algorithm changed, or that post just did not land.",
    know: "Reach dropped and every status page is clean.",
    appeal: "Nothing to appeal. Go make better content.",
  },
];

const APPEAL_RULES = [
  "Short. Under 200 words if there is a box.",
  'No emotion. Cut "this is unfair," "I\'ve been loyal for nine years," "you people." Every one of those makes it worse.',
  'Do not argue the policy. Argue the application. You will never win "your rule is wrong." You can win "my content is not what that rule describes."',
  "If you did it, say so. Concession plus a specific correction beats defiance by a mile. Reviewers are looking for evidence you understand the rule now.",
  "Appeal once. Do not resubmit ten times and do not have friends mass-report or mass-appeal on your behalf. Coordinated activity is itself a violation on most platforms and you will make it permanent.",
  "Do not threaten legal action in the box. It routes you into a legal queue that is slower, colder, and far less forgiving than the normal one.",
];

const WHILE_YOU_WAIT = [
  "Export everything you still can. Content, contacts, anything the platform will hand over. Do it today. If the account goes fully dark you lose the ability.",
  "Stand up one page you own. One. It does not have to be pretty. It has to exist and it has to have your name on the domain.",
  "Tell the audience you still have where to find you. Every other platform, every group chat, every email you have.",
  "Start the list. Email addresses and phone numbers. That is the only audience on earth that nobody can switch off.",
  "Keep publishing. Somewhere. The silence is what actually kills a voice, not the suspension.",
];

const HEAD_RULES = [
  {
    rule: "The twenty-minute rule.",
    body: "Never reply within twenty minutes of feeling it. Not twenty minutes of reading it. Twenty minutes of the feeling. The reply that ends a business is always written inside that window, every single time, without exception. Nothing on the internet gets worse in twenty minutes. You do.",
  },
  {
    rule: "Write the angry version somewhere it cannot send.",
    body: "Notes app. Paper. Voice memo you delete. Get all of it out, every word you actually want to say, unedited and ugly. Then close it and write the real one. The anger is not the problem. Anger typed directly into a box with a Send button is the problem.",
  },
  {
    rule: "Do not reread it.",
    body: "Twice, maximum. Every reread after that is rehearsal. You are not gathering information anymore, you are practicing being hurt. Screenshot it, file it, close the tab.",
  },
  {
    rule: "Cap the checks.",
    body: "Once in the morning, once in the evening. Not forty. The forty checks are what turn one comment into a week of your life, and they do not change a single thing about the comment.",
  },
  {
    rule: "Look at the number that matters before you decide how bad it was.",
    body: "One comment feels like the whole world. Open the actual numbers first. Leads this week. Calls. Sales. Reach. Then decide how much of your day this deserves. Usually the answer is a lot less than it is currently taking.",
  },
  {
    rule: "Do the lurker math.",
    body: "On a post with 4 reactions and 5 comments, hundreds of people scrolled past and said nothing. One person typed something rude. You are letting the loudest fraction of one percent set your mood, and they are not your customers. Your customers are the silent ones, and they are watching how you handle it.",
  },
];

const RECORD_CAPTURE = [
  "Full screenshot showing the comment and the surrounding thread, not a crop",
  "The URL of the post or thread",
  "The date and time, visible in the shot where possible",
  "The username exactly as displayed",
  "Screen recording instead of a screenshot when the thread is long or moving fast",
  "Your own reply, if you made one",
  "Anything that shows the sequence: what came before, what came after",
];

function SectionHeading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div className="mt-16">
      <p className="cb-eyebrow">{kicker}</p>
      <h2 id={id} className="cb-h2 cb-heading mt-2">
        {title}
      </h2>
    </div>
  );
}

const CARD =
  "rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6";

export default function PlaybookPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero" aria-labelledby="playbook-title">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Hold The Line · Your playbook
            </p>
            <h1 id="playbook-title" className="cb-h1">
              The Hold The Line
              <em>Playbook.</em>
            </h1>
            <p className="cb-hero-lead">
              The whole skill is two moves: sort them correctly, then answer the right
              one. Almost every account that gets lost was lost because somebody skipped
              step one. They read a mild objection as a personal attack, answered it like
              a personal attack, escalated, and handed the platform a reason.
            </p>
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" />
              Bookmark this page. It is yours, and it does not expire.
            </p>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell max-w-4xl">
          {/* ------------------------------------------------- the doctrine */}
          <SectionHeading id="doctrine" kicker="Part one" title="The doctrine. Ten rules." />
          <p className="cb-lead mt-4">
            Everything else in this playbook is built on these.
          </p>
          <ol className="mt-8 grid gap-4">
            {DOCTRINE.map((d, i) => (
              <li key={d.rule} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">
                  {i + 1}. {d.rule}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--quiet)]">
                  {d.body}
                </p>
              </li>
            ))}
          </ol>

          {/* -------------------------------------------------- the sorting */}
          <SectionHeading id="sorting" kicker="Part two" title="Step 1. Sort them." />
          <p className="cb-lead mt-4">
            Seven kinds of people show up in your comments. They get seven different
            answers.
          </p>
          <div className="mt-8 grid gap-4">
            {SORTING.map((s) => (
              <article key={s.type} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">{s.type}</h3>
                <dl className="mt-3 grid gap-2 text-[14px] leading-relaxed">
                  <div>
                    <dt className="font-semibold text-[var(--text)]">What it looks like</dt>
                    <dd className="text-[var(--quiet)]">{s.looks}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--text)]">
                      What they actually want
                    </dt>
                    <dd className="text-[var(--quiet)]">{s.wants}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--text)]">Your move</dt>
                    <dd className="text-[var(--quiet)]">{s.move}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--text)]">Never</dt>
                    <dd className="text-[var(--quiet)]">{s.never}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>The sorting question that settles it:</strong> does this comment
              contain a claim, or only a feeling? A claim can be answered. Concede,
              correct, or reframe. A feeling with no claim cannot be answered, only fed.
              One line or nothing.
            </p>
          </div>

          {/* --------------------------------------------- four-part reply */}
          <SectionHeading id="reply" kicker="Part three" title="Step 2. The four-part reply." />
          <p className="cb-lead mt-4">
            Every reply that works in public has the same four moves in the same order.
            Learn the shape once and you never stare at the box again.
          </p>
          <ol className="mt-8 grid gap-4">
            {[
              [
                "Concede.",
                "One line agreeing with whatever in their comment is true. If nothing is true, agree with the reasonable version of their concern. This removes their footing before you have said anything else.",
              ],
              [
                "Reframe.",
                "Say what the real thing actually is. This is where you make your point, exactly once.",
              ],
              [
                "Respect.",
                "Give them a dignified way out. People who are not cornered stop swinging. People who are cornered escalate, and escalation is what costs you the account.",
              ],
              [
                "Close to the reader.",
                "The last sentence is not for them. It is for the fifty people reading silently who were quietly wondering the same thing. This is the sentence that makes you money.",
              ],
            ].map(([head, body], i) => (
              <li key={head} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">
                  {i + 1}. {head}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--quiet)]">
                  {body}
                </p>
              </li>
            ))}
          </ol>

          {/* ---------------------------------------------------- library */}
          <SectionHeading id="library" kicker="Part four" title="Step 3. The response library." />
          <p className="cb-lead mt-4">Adapt, do not paste blind. The shape is the product, not the words.</p>
          <div className="mt-8 grid gap-4">
            {LIBRARY.map((entry) => (
              <article key={entry.situation} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">
                  {entry.situation}
                </h3>
                {entry.reply.length ? (
                  <blockquote className="mt-3 border-l-2 border-[var(--line-strong)] pl-4 text-[15px] leading-relaxed text-[var(--quiet)]">
                    {entry.reply.map((line) => (
                      <p key={line} className="mt-2 first:mt-0">
                        {line}
                      </p>
                    ))}
                  </blockquote>
                ) : null}
                {entry.note ? (
                  <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[var(--text)]">
                    {entry.note}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          {/* -------------------------------------------------- never type */}
          <SectionHeading id="never-type" kicker="Part five" title="What never to type." />
          <p className="cb-lead mt-4">
            This list is the difference between a business page and a memory. Nothing on
            it is worth what it costs.
          </p>
          <ul className="mt-8 grid gap-3">
            {NEVER_TYPE.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <span aria-hidden="true" className="mt-0.5 font-extrabold">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* ---------------------------------------------- 60-second check */}
          <SectionHeading
            id="pre-send-check"
            kicker="Part six"
            title="The 60-second check before you hit reply."
          />
          <ol className="mt-8 grid gap-3">
            {SIXTY_SECOND.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <span className="font-extrabold">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] font-semibold text-[var(--text)]">
              Six of seven is a rewrite. All seven is a send.
            </p>
          </div>

          {/* ----------------------------------------------- recovery */}
          <SectionHeading
            id="recovery"
            kicker="Part seven"
            title="Already suspended, demonetized, or de-recommended."
          />
          <p className="cb-lead mt-4">
            Five different things get called banned. They have five different fixes, and
            people burn weeks appealing something that was never a penalty in the first
            place. Platform menus and policy names change constantly; the method below is
            what holds. Verify the exact click path on your platform before you follow it.
          </p>
          <div className="mt-8 grid gap-4">
            {BANNED_KINDS.map((k) => (
              <article key={k.called} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">{k.called}</h3>
                <dl className="mt-3 grid gap-2 text-[14px] leading-relaxed">
                  <div>
                    <dt className="font-semibold text-[var(--text)]">What it actually is</dt>
                    <dd className="text-[var(--quiet)]">{k.is}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--text)]">How you know</dt>
                    <dd className="text-[var(--quiet)]">{k.know}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--text)]">Appealable?</dt>
                    <dd className="text-[var(--quiet)]">{k.appeal}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>Do this before anything else:</strong> open the account status page
              on the platform. Most have one now. If it says you are in good standing,
              you were not penalized, and no appeal in the world will bring your reach
              back. That is a content and consistency problem wearing a censorship
              costume, and hearing the truth about that is worth more than an appeal.
            </p>
          </div>

          <h3 className="mt-10 text-[18px] font-extrabold text-[var(--text)]">
            The appeal that works
          </h3>
          <ol className="mt-4 grid gap-3">
            {APPEAL_RULES.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <span className="font-extrabold">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className={`${CARD} mt-6`}>
            <h4 className="text-[15px] font-extrabold text-[var(--text)]">
              Template, if you did it
            </h4>
            <blockquote className="mt-3 border-l-2 border-[var(--line-strong)] pl-4 text-[14px] leading-relaxed text-[var(--quiet)]">
              <p>My account was [restricted / demonetized] on [date] under [policy name].</p>
              <p className="mt-2">
                I understand why [specific content] was flagged. [One honest sentence
                about what it was.] I have removed it and reviewed the rest of my content
                for the same issue.
              </p>
              <p className="mt-2">
                I have read [policy name] and I have [specific corrective action].
              </p>
              <p className="mt-2">I am asking for a review. Thank you.</p>
            </blockquote>
          </div>
          <div className={`${CARD} mt-4`}>
            <h4 className="text-[15px] font-extrabold text-[var(--text)]">
              Template, if you did not
            </h4>
            <blockquote className="mt-3 border-l-2 border-[var(--line-strong)] pl-4 text-[14px] leading-relaxed text-[var(--quiet)]">
              <p>My account was [restricted / demonetized] on [date] under [policy name].</p>
              <p className="mt-2">
                The content in question was [plain description]. I believe it was reviewed
                as [what they thought it was] when it is actually [what it is].
                Specifically: [one concrete factual detail a reviewer can verify in ten
                seconds].
              </p>
              <p className="mt-2">
                I am asking for a human review of this decision. Thank you.
              </p>
            </blockquote>
          </div>

          <h3 className="mt-10 text-[18px] font-extrabold text-[var(--text)]">
            What to do while you wait
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--quiet)]">
            Most people sit and refresh. That is the worst thing you can do, and not only
            for your head.
          </p>
          <ol className="mt-4 grid gap-3">
            {WHILE_YOU_WAIT.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <span className="font-extrabold">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>The honest part, said out loud:</strong> the appeal might not work.
              Some never do. Which means the real product was never the appeal. It is
              making sure this cannot take you out again. Rented platforms are for
              distribution. Owned platforms are for survival. A domain with your name on
              it. A site you control. An email list. A phone list.
            </p>
          </div>

          {/* ------------------------------------------------- the record */}
          <SectionHeading
            id="record"
            kicker="Part eight"
            title="Build the record instead of taking the bait."
          />
          <p className="cb-lead mt-4">
            The difference between the person who wins these and the person who loses
            their account is almost never who was right. It is who wrote it down.
            Documentation is what you do instead of hitting back.
          </p>
          <div className={`${CARD} mt-8`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>The line, stated plainly:</strong> documenting what was done to you
              is defense. Compiling a profile on a person is offense. They are not the
              same thing and the second one will end you. Every comment that account
              posted on your page, with timestamps and URLs, is a record of things that
              happened to you, on property you control. Where he works, his family, his
              address, his history: the moment you open a file on a private person's
              life, you are no longer defending yourself, and every platform, every
              court, and every prospect watching will read it exactly that way.
            </p>
          </div>
          <h3 className="mt-8 text-[18px] font-extrabold text-[var(--text)]">
            What to capture, immediately
          </h3>
          <ul className="mt-4 grid gap-3">
            {RECORD_CAPTURE.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <span aria-hidden="true" className="mt-0.5 font-extrabold">
                  ▢
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--quiet)]">
            Where it goes: somewhere off the platform. A folder in cloud storage, synced.
            Not your camera roll, and not saved posts on the app itself, which disappears
            with the account. Name files{" "}
            <code className="text-[13px]">YYYY-MM-DD-platform-username-short-description</code>{" "}
            so the record sorts itself.
          </p>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>The record stays private by default.</strong> It exists so you are
              protected, not so you have ammunition. It never goes public as a page,
              site, or dashboard about a named private individual, no matter how much
              material you have. If the material is that strong, it goes to a lawyer or
              to law enforcement, not to a URL.
            </p>
          </div>

          {/* ------------------------------------------------ protect head */}
          <SectionHeading
            id="head"
            kicker="Part nine"
            title="Protect your head while you are in it."
          />
          <p className="cb-lead mt-4">
            The tactical stuff only works if you are steady enough to run it. Nobody
            sorts a comment correctly at 1am on their fourth read-through. This is not
            soft. It is the maintenance schedule on the equipment.
          </p>
          <div className="mt-8 grid gap-4">
            {HEAD_RULES.map((d) => (
              <article key={d.rule} className={CARD}>
                <h3 className="text-[16px] font-extrabold text-[var(--text)]">{d.rule}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--quiet)]">
                  {d.body}
                </p>
              </article>
            ))}
          </div>
          <div className={`${CARD} mt-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">
              <strong>Name it correctly.</strong> A bad comment is a business event, not
              a verdict on you. It goes in the same mental bucket as a no-show, a
              chargeback, or a truck that will not start. Annoying. Handled. Logged.
              Next. You are allowed to think somebody is wrong, handle it in one reply,
              and go back to work still believing you are good at what you do.
            </p>
          </div>
          <div className={`${CARD} mt-4`}>
            <p className="text-[15px] leading-relaxed text-[var(--quiet)]">
              If this is costing you sleep, meals, or people, that stopped being a
              comment section problem. Talk to a real person. We help people build
              platforms; we are not equipped to be anybody's mental health support, and
              pretending otherwise would not be helping you.
            </p>
          </div>

          {/* ----------------------------------------------------- the door */}
          <SectionHeading id="next" kicker="The last question" title="Where does your voice live?" />
          <p className="cb-lead mt-4">
            If this ever happens again, where does your story live that nobody can turn
            off? When you are ready for that answer, it is a site, a list, and a number
            you own.
          </p>
          <div className="cb-actions mt-8">
            <Link className="cb-btn cb-btn--primary" href="/offers/comment-rescue">
              Something live in your comments? Comment Rescue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/offers/voice-recovery">
              Already suspended? Voice Recovery
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/packages/launch">
              The permanent fix: Website Launch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
