import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EXPANSION_COURSES } from "../lib/operatorAcademyCatalog.ts";
import { CHATGPT_OPERATOR_LEVELS } from "../lib/chatgptOperatorCourse.ts";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const output = path.join(repositoryRoot, "supabase/migrations/20260831041435_chatgpt_operator_course.sql");

const chatgptDetails = {
  "set-up-a-project-that-remembers-the-work": {
    outcome: "Create one clean ChatGPT Project with instructions, reference files, and separate working chats that keep business context organized.",
    method: ["Name the project for one durable outcome", "Add only trusted reference material", "Open a separate chat for each deliverable"],
    prompt: "Help me set up a ChatGPT Project for [business or outcome]. Ask me for the minimum information needed, then draft project instructions covering role, audience, voice, approved facts, boundaries, output standards, and what to ask before acting. Do not invent business facts.",
    assignment: "Create the project, paste the approved instructions, add one trusted file, and open a chat named First Working Build.",
    reviewCriteria: "The project has a single purpose, source-labeled context, clear boundaries, and no private information that is unnecessary for the work.",
    download: "OA01 ChatGPT Operator Workbook, Project setup",
    visual: "Project, instructions, files, and separate chats diagram",
  },
  "give-chatgpt-goal-context-output-and-boundaries": {
    outcome: "Write prompts with a goal, context, output format, and boundaries so useful results arrive with less back-and-forth.",
    method: ["State the result", "Supply only relevant context", "Specify format and limits"],
    prompt: "Goal: [what must be finished]. Context: [facts, audience, source material]. Output: [exact format, length, and sections]. Boundaries: [facts not to invent, claims to avoid, tools or sources required, and questions to ask]. Before drafting, list any missing fact that would materially change the result.",
    assignment: "Rewrite one vague prompt with all four parts and compare the first result to the revised result.",
    reviewCriteria: "A new reader can identify the goal, trusted context, expected output, and non-negotiable boundaries without guessing.",
    download: "OA01 ChatGPT Operator Workbook, Four-part prompt card",
    visual: "Goal-context-output-boundaries prompt frame",
  },
  "build-your-first-business-content-kit": {
    outcome: "Turn one approved business fact set into a coordinated social post, email, short video script, and call to action.",
    method: ["Approve one source brief", "Adapt the idea to each channel", "Run a consistency review"],
    prompt: "Using only this approved business brief: [paste], create a content kit with one Facebook post, one Instagram caption, one 90-word email, one 30-second direct-to-camera script, and one consistent call to action. Keep the voice [describe]. Do not add claims, statistics, testimonials, or urgency that are not in the brief.",
    assignment: "Produce the five-piece kit, revise it once, and save the final source brief with the outputs.",
    reviewCriteria: "All five pieces match the same facts and next action while fitting their individual channels.",
    download: "OA01 ChatGPT Operator Workbook, Content kit builder",
    visual: "One source to five content assets",
  },
  "create-and-refine-a-professional-image": {
    outcome: "Create a professional profile or campaign image with a clear purpose, composition, style, text rule, and revision process.",
    method: ["Define intended use", "Describe subject and composition", "Revise one variable at a time"],
    prompt: "Create a professional [profile picture or marketing image] for [purpose]. Subject: [describe]. Composition: [crop, placement, negative space]. Style: [photorealistic, editorial, illustration]. Lighting and mood: [describe]. Colors: [palette]. Constraints: preserve natural facial proportions if a reference is supplied, no invented logos, no watermark, and no text unless quoted verbatim. Produce one polished direction.",
    assignment: "Generate one image, inspect the face, hands, text, edges, and brand fit, then make one targeted revision.",
    reviewCriteria: "The image fits its intended placement, avoids visible artifacts, and follows every identity and text constraint.",
    download: "OA01 ChatGPT Operator Workbook, Image prompt and QA",
    visual: "Purpose-subject-composition-style-constraints image frame",
  },
  "write-social-posts-and-emails-that-sound-human": {
    outcome: "Write channel-specific posts and emails that preserve the operator's real voice, story, and next action.",
    method: ["Capture real source language", "Write for one reader", "Read aloud and remove generic phrasing"],
    prompt: "Study this writing sample and source note: [paste]. First describe the voice using observable traits. Then write one Facebook post and one email for [audience and goal]. Preserve the natural sentence rhythm and plain language. Do not use em dashes, fake quotes, invented experiences, or generic motivational filler. End with one useful next action.",
    assignment: "Create a post and email from the same source note, read both aloud, and highlight three changes that made them sound more like you.",
    reviewCriteria: "The writing uses source-backed details, fits the channel, and sounds credible when spoken aloud.",
    download: "OA01 ChatGPT Operator Workbook, Voice and channel checklist",
    visual: "Source voice to channel adaptation",
  },
  "build-a-working-one-page-landing-page": {
    outcome: "Use ChatGPT's working preview to build and revise a responsive one-page site with a clear offer and functional form states.",
    method: ["Give the page one job", "Request a working responsive build", "Test every interaction and state"],
    prompt: "Build a polished one-page landing page in the working preview for this fictional business: Pine Ridge Pressure Washing in Longview, Texas. Audience: homeowners preparing for spring. Offer: free driveway assessment. Include a strong hero, three services, three-step process, trust section with clearly labeled sample placeholders rather than invented reviews, FAQ, and contact form with name, phone, email, service, loading, success, and error states. Use deep forest green, warm cream, and copper. Make it mobile responsive and accessible. Do not claim the form sends anywhere unless a backend is connected.",
    assignment: "Run the build, inspect desktop and mobile, test the form states, and make one evidence-based revision.",
    reviewCriteria: "The page loads, responds to screen size, explains the fictional offer, labels examples, and handles form interaction honestly.",
    download: "OA01 ChatGPT Operator Workbook, Landing page brief and QA",
    visual: "Prompt to preview to test to revision loop",
  },
  "research-current-information-with-sources": {
    outcome: "Research changing information with current sources, dates, direct links, and a clear separation between evidence and inference.",
    method: ["Ask a decision question", "Prefer primary current sources", "Verify claims across the source trail"],
    prompt: "Research this current question: [question]. Use the web. Prefer primary and authoritative sources. For each material claim, provide the source title, direct link, publication or update date, and what it supports. Separate verified facts, reasonable inferences, conflicting evidence, and unanswered questions. End with the decision this research can and cannot support.",
    assignment: "Research one real business decision, open every cited source, and remove any claim the source does not directly support.",
    reviewCriteria: "Material claims are current, traceable to direct sources, dated, and clearly separated from inference.",
    download: "OA01 ChatGPT Operator Workbook, Source verification log",
    visual: "Question-source-claim-decision trail",
  },
  "turn-files-and-notes-into-client-ready-work": {
    outcome: "Transform supplied files and notes into a structured deliverable without losing facts, decisions, ownership, or unresolved questions.",
    method: ["Inventory the source set", "Define the deliverable schema", "Trace decisions back to evidence"],
    prompt: "Use only the attached files and notes to create a [brief, proposal, SOP, or report] for [reader and decision]. First list the sources and any conflicts. Then produce the deliverable with executive summary, verified facts, decisions, action items with owners and dates, risks, open questions, and a source appendix. Do not fill gaps with assumptions.",
    assignment: "Create one client-ready document from at least two source files and verify five statements against the originals.",
    reviewCriteria: "The deliverable is usable by its reader, preserves source truth, labels gaps, and converts decisions into owned actions.",
    download: "OA01 ChatGPT Operator Workbook, File-to-deliverable map",
    visual: "Files and notes to structured client output",
  },
  "run-a-quality-control-and-revision-loop": {
    outcome: "Use a repeatable audit, issue list, targeted revision, and final verification loop before delivering AI-assisted work.",
    method: ["Audit against requirements", "Prioritize material defects", "Revise and verify the final version"],
    prompt: "Audit this deliverable against the original brief and sources: [paste or attach]. Return a table with requirement, evidence, status, severity, exact issue, and proposed fix. Check factual support, missing content, contradictions, tone, accessibility, privacy, functionality, and unsupported claims. Do not rewrite yet. Wait for approval of the issue list.",
    assignment: "Audit one client deliverable, approve the issue list, revise it, and run the audit again on the final version.",
    reviewCriteria: "Every requirement is verified, material issues are resolved, and the final version is checked rather than assumed correct.",
    download: "OA01 ChatGPT Operator Workbook, Quality-control scorecard",
    visual: "Brief-audit-fix-verify cycle",
  },
  "design-a-repeatable-ai-workflow": {
    outcome: "Turn a recurring business task into a documented input, processing, review, output, storage, and next-action workflow.",
    method: ["Define the trigger and inputs", "Separate creation from review", "Save the output and decision"],
    prompt: "Design a repeatable AI-assisted workflow for [task]. Include trigger, owner, trusted inputs, prompt or instructions, tools, output format, quality checks, approval gate, storage location, next action, failure state, and audit record. Mark what is automated, what is drafted, and what remains human-only.",
    assignment: "Document one recurring workflow, run it twice with different inputs, and revise the instructions where the results diverge.",
    reviewCriteria: "A second person can run the workflow, review the output, recover from failure, and find the saved record.",
    download: "OA01 ChatGPT Operator Workbook, Workflow canvas",
    visual: "Trigger-input-create-review-store-act sequence",
  },
  "protect-data-control-actions-and-review-results": {
    outcome: "Use minimum necessary data, keep secrets out of prompts and browsers, and require human approval for consequential actions.",
    method: ["Classify information", "Use least privilege", "Put review before external action"],
    prompt: "Perform a privacy, security, and action-risk review for this ChatGPT workflow: [describe]. Identify personal data, confidential information, credentials, untrusted files, external writes, public claims, financial or legal consequences, retention, and required human review. Return safe, caution, and prohibited handling rules. This is an operational review, not legal advice.",
    assignment: "Run the review on your capstone workflow and remove or protect every unnecessary sensitive input.",
    reviewCriteria: "Secrets stay server-side, sensitive data is minimized, untrusted content cannot change instructions, and consequential actions require approval.",
    download: "OA01 ChatGPT Operator Workbook, Safety and approval review",
    visual: "Data and action risk boundary",
  },
  "build-and-submit-the-operator-capstone": {
    outcome: "Build a complete ChatGPT-assisted business system that moves from approved input to a reviewed asset, owned record, and measurable next action.",
    method: ["Choose one real workflow", "Create the full evidence package", "Submit the artifact and runbook for review"],
    prompt: "Act as a capstone reviewer. I am building [workflow] for [business]. Interview me one question at a time until you can produce: approved brief, source register, project instructions, working prompt, output schema, safety rules, quality checklist, example deliverable, storage plan, next action, metric, and failure recovery. Do not invent missing business facts.",
    assignment: "Submit one viewable capstone link containing the brief, sources, prompts, finished deliverable, quality evidence, safety review, runbook, and result metric.",
    reviewCriteria: "The capstone produces a useful business result, is repeatable, preserves source truth, includes human control, and can be independently reviewed.",
    download: "OA01 ChatGPT Operator Workbook, Capstone submission pack",
    visual: "Complete ChatGPT Operator capstone system",
  },
};

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function dollar(value, tag = "oa") {
  return `$${tag}$${String(value)}$${tag}$`;
}

function lessonMarkdown(course, item) {
  const method = item.method.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return `# ${item.code}: ${item.title}

## What you will finish

${item.outcome}

## Why this matters

This lesson is built around an observable business output. Watching the video is orientation. Completion means producing the assignment, checking it against the standard, and saving the evidence in your owned system.

## Lesson video and teleprompter script

**Recording status:** Scripted and ready for Ryan to record. The video player will appear above this lesson when the approved recording URL is added.

**Target runtime:** ${item.deliverable ? "8 to 12" : "5 to 8"} minutes.

**Opening hook:** If you finish this lesson, you will be able to ${item.outcome.charAt(0).toLowerCase()}${item.outcome.slice(1)}

**Teleprompter script:**

The result of this lesson is simple: ${item.outcome}

That matters because tools and tactics become expensive when the underlying decision is unclear. A useful operator starts with the result, identifies the facts the work depends on, and decides what proof will show that the work is complete.

The first move is this: ${item.method[0].charAt(0).toLowerCase()}${item.method[0].slice(1)}. Do not rush past it. Write the answer down in plain language so another person can challenge it.

Then ${item.method[1].charAt(0).toLowerCase()}${item.method[1].slice(1)}. This is where the work becomes a system instead of a one-time guess. Keep the source, the decision, and the output connected.

Finally, ${item.method[2].charAt(0).toLowerCase()}${item.method[2].slice(1)}. Use the review standard before you call the work finished. If the result fails the standard, revise the smallest thing that can fix it and check it again.

The prompt in this lesson can help you think and draft, but it cannot supply facts you never gave it. Review every claim, link, number, action, and private detail before you use the output in the business.

Your assignment is: ${item.assignment}

The work passes when ${item.reviewCriteria.charAt(0).toLowerCase()}${item.reviewCriteria.slice(1)}

Do the work before marking the lesson complete. That artifact becomes evidence for your final assessment and capstone.

## On-screen visual and picture plan

- **Primary visual:** ${item.visual}.
- **Screen recording:** Show the input, the working prompt, the first result, the review, and one targeted revision.
- **Picture direction:** Use a real workspace or business example when available. Label fictional examples and placeholders on screen.
- **Graphic:** Use the course map below as the visual anchor while explaining where this lesson fits.

![${course.shortTitle} course visual](/images/academy/${course.slug}.svg)

## Operator method

${method}

## Exact working prompt

\`\`\`text
${item.prompt}
\`\`\`

## Guided practice

Run the exact prompt with a small, low-risk example. Save the first output. Review it against the lesson standard. Change one input or instruction, run it again, and write one sentence explaining why the revision is better.

## Assignment and evidence

${item.assignment}

Save the source material, prompt, first result, final result, and review notes. If this is a designated deliverable lesson, use the submission panel below to send the viewable link for review.

## Pass standard

${item.reviewCriteria}

## Downloadable

[Open the ${course.shortTitle} workbook](/downloads/operator-academy/${course.slug}-workbook.pdf)

Workbook section: ${item.download}.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.`;
}

const chatgptLessons = CHATGPT_OPERATOR_LEVELS.flatMap((level) => level.lessons).map((item) => ({
  ...item,
  ...chatgptDetails[item.slug],
}));

const chatgptCourse = {
  code: "OA01",
  slug: "chatgpt-operator",
  title: "Operator Academy 01: The ChatGPT Operator",
  shortTitle: "The ChatGPT Operator",
  description: "Turn ChatGPT into a repeatable business workbench for writing, images, research, landing pages, and client-ready deliverables.",
  isFree: false,
  lessons: chatgptLessons,
};

const header = `-- The LeadFlow Operator Academy expansion
-- OA01 ChatGPT Operator, OA03-OA10, lead-gated free access, reviewed deliverables,
-- broader private credential codes, and complete written lesson packages.

create table if not exists public.academy_lead_access_tokens (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists academy_lead_access_tokens_lead_expires_idx
  on public.academy_lead_access_tokens (lead_id, expires_at desc);
create index if not exists academy_lead_access_tokens_expires_idx
  on public.academy_lead_access_tokens (expires_at);

alter table public.academy_lead_access_tokens enable row level security;
revoke all on table public.academy_lead_access_tokens from anon, authenticated;
grant all on table public.academy_lead_access_tokens to service_role;

comment on table public.academy_lead_access_tokens is
  'Server-only hashed browser grants for the two free, lead-gated Operator Academy courses.';

create table if not exists public.course_deliverable_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  submission_url text not null check (submission_url ~ '^https://' and char_length(submission_url) <= 2000),
  notes text not null check (char_length(btrim(notes)) between 10 and 4000),
  status text not null default 'pending' check (status in ('pending', 'revision_requested', 'approved')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_notes text check (review_notes is null or char_length(review_notes) <= 4000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists course_deliverable_submissions_review_idx
  on public.course_deliverable_submissions (status, submitted_at desc);
create index if not exists course_deliverable_submissions_user_course_idx
  on public.course_deliverable_submissions (user_id, course_id, submitted_at desc);

alter table public.course_deliverable_submissions enable row level security;
revoke all on table public.course_deliverable_submissions from anon, authenticated;
grant select on table public.course_deliverable_submissions to authenticated;
grant all on table public.course_deliverable_submissions to service_role;

drop policy if exists "own deliverable submissions read" on public.course_deliverable_submissions;
create policy "own deliverable submissions read"
  on public.course_deliverable_submissions for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.course_deliverable_submissions is
  'Learner capstone and major-build links with explicit reviewer decisions. Writes occur through authenticated server routes.';

alter table public.course_credentials
  drop constraint if exists course_credentials_credential_code_check;
alter table public.course_credentials
  add constraint course_credentials_credential_code_check
  check (credential_code ~ '^LFP-OA[0-9]{2}-[A-Z0-9]{8}$');
`;

function courseSql(course, sortOrder) {
  const courseInsert = `
insert into public.courses (slug, title, description, sort_order, is_published, is_free)
values (${quote(course.slug)}, ${quote(course.title)}, ${quote(course.description)}, ${sortOrder}, true, ${course.isFree ? "true" : "false"})
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  is_free = excluded.is_free;
`;
  const lessonInserts = course.lessons.map((item, index) => {
    const summary = `${item.outcome} Target lesson time: ${item.estimatedMinutes ?? (item.deliverable ? 18 : 12)} minutes.`;
    const content = lessonMarkdown(course, item);
    return `
insert into public.lessons (course_id, slug, title, summary, content, video_url, sort_order, is_published)
select id, ${quote(item.slug)}, ${quote(item.title)}, ${quote(summary)}, ${dollar(content, `oa${course.code.slice(2)}l${index + 1}`)}, null, ${index + 1}, true
from public.courses where slug = ${quote(course.slug)}
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;
`;
  }).join("\n");
  return courseInsert + lessonInserts;
}

const sql = [
  header,
  courseSql(chatgptCourse, 10),
  ...EXPANSION_COURSES.map((course, index) => courseSql(course, (index + 3) * 10)),
  `\n-- Rollback plan: unpublish the added courses, preserve learner records, then remove only unused token grants.\n`,
].join("\n");

writeFileSync(output, sql);
console.log(`Wrote ${output} with ${chatgptCourse.lessons.length + EXPANSION_COURSES.reduce((total, course) => total + course.lessons.length, 0)} lessons.`);
