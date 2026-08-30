-- Operator Academy 02: The Content Engine
-- Additive course, assessment, assignment, and private completion credential support.

create table if not exists public.course_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists course_assignment_progress_lesson_user_idx
  on public.course_assignment_progress (lesson_id, user_id);

create table if not exists public.course_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  assessment_kind text not null check (assessment_kind in ('lesson', 'final')),
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0),
  passed boolean not null,
  answers jsonb not null default '[]'::jsonb check (
    jsonb_typeof(answers) = 'array' and pg_column_size(answers) <= 32768
  ),
  created_at timestamptz not null default now(),
  check (score <= max_score),
  check (
    (assessment_kind = 'lesson' and lesson_id is not null)
    or (assessment_kind = 'final' and lesson_id is null)
  )
);

create index if not exists course_quiz_attempts_user_course_created_idx
  on public.course_quiz_attempts (user_id, course_id, created_at desc);
create index if not exists course_quiz_attempts_lesson_user_idx
  on public.course_quiz_attempts (lesson_id, user_id, created_at desc)
  where lesson_id is not null;

create table if not exists public.course_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  credential_code text not null unique check (
    credential_code ~ '^LFP-OA02-[A-Z0-9]{8}$'
  ),
  learner_name text not null check (
    char_length(btrim(learner_name)) between 1 and 200
  ),
  final_score integer not null check (final_score between 0 and 100),
  credential_type text not null default 'course_completion' check (
    credential_type = 'course_completion'
  ),
  issuer text not null default 'The LeadFlow Pro, operated by Longview Training Center LLC',
  disclaimer text not null default 'Private course completion credential. Not a degree, professional license, accreditation, state or federal certification, promise of employment, or guarantee of business results.',
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_credentials_course_issued_idx
  on public.course_credentials (course_id, issued_at desc);

alter table public.course_assignment_progress enable row level security;
alter table public.course_quiz_attempts enable row level security;
alter table public.course_credentials enable row level security;

revoke all on table public.course_assignment_progress from anon, authenticated;
revoke all on table public.course_quiz_attempts from anon, authenticated;
revoke all on table public.course_credentials from anon, authenticated;

grant select, insert, update, delete on table public.course_assignment_progress to authenticated;
grant select on table public.course_quiz_attempts to authenticated;
grant select on table public.course_credentials to authenticated;
grant all on table public.course_assignment_progress to service_role;
grant all on table public.course_quiz_attempts to service_role;
grant all on table public.course_credentials to service_role;

drop policy if exists "own assignment progress" on public.course_assignment_progress;
create policy "own assignment progress"
  on public.course_assignment_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own quiz attempts read" on public.course_quiz_attempts;
create policy "own quiz attempts read"
  on public.course_quiz_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own credentials read" on public.course_credentials;
create policy "own credentials read"
  on public.course_credentials
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.course_assignment_progress is
  'Learner self-attestation that a published lesson assignment is complete.';
comment on table public.course_quiz_attempts is
  'Immutable server-graded assessment attempts. Answer keys never enter browser data.';
comment on table public.course_credentials is
  'Private LeadFlow Pro course completion credentials. Never an accredited or government credential.';

insert into public.courses (
  slug, title, description, sort_order, is_published, is_free
)
values (
  'content-engine',
  'Operator Academy 02: The Content Engine',
  'Build one clear offer, thirty useful video topics, ten camera ready scripts, one repeatable recording setup, and one owned path from every video to a page, form, or checkout.',
  20,
  true,
  false
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  is_free = excluded.is_free;


insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'stop-posting-without-a-destination',
  'Stop Posting Without a Destination',
  'Module One: Give the Content a Job. Show why the content system begins with one owned destination and one measurable next action.',
  $content_engine_lesson$# CE L01: Stop Posting Without a Destination

## Module and purpose

Module One: Give the Content a Job. Show why the content system begins with one owned destination and one measurable next action.

## Main Teleprompter script

Today I recorded eight videos.

The camera was not the breakthrough.

The destination was.

For a long time, I could make a video whenever something hit me. I could tell a story. I could get fired up. I could teach something useful. But if that video did not send the right person toward a clear next action, all I had made was another piece of content floating around the internet.

That is where this course starts.

Before we talk about hooks, cameras, captions, backgrounds, editing, or artificial intelligence, we have to give the content a job.

Look at the three lines beside me.

One person.

One useful promise.

One next action.

The person is not everybody who owns a phone. It is the person with the problem you actually know how to help solve.

The promise is not that you will make them rich, famous, or number one on Google. The promise is the useful result this lesson, offer, or system can honestly help them produce.

The next action is where they go after the video. That might be a course page, a diagnostic, a booking page, a product checkout, or one article that answers the next question. It needs to be something you own and something you can measure.

Here is the mistake I do not want you to make.

Do not build ten videos with ten different destinations. Do not send one person to Facebook, the next person to a random homepage, and the next person to a link you forgot to update.

Pick one destination for the batch.

For this course, the destination is The Content Engine page on TheLeadFlowPro.com. Every public lesson and every launch video should help the right business owner decide whether this system fits the problem they are trying to solve.

That does not mean every video is a commercial. Most of them should be useful on their own. But usefulness and direction are not enemies. You can teach something real and still tell the viewer what to do next.

Your assignment is simple.

Write one sentence.

These next ten videos are for blank. They help with blank. When the video ends, the next step is blank.

If you cannot finish that sentence, do not start writing ten scripts yet.

Give the content a job first.

Once the destination is clear, the rest of the system gets a whole lot easier.

## Script metrics

Main script words: 398

Target pace: 115 words per minute

Estimated runtime: 3:28

## On screen hook

Today I recorded eight videos. The camera was not the breakthrough. The destination was.

## Lesson panel

One person

One useful promise

One next action

## Assignment

Write one sentence that names who the next ten videos are for, what problem they help with, and the one page every video will point toward.

## Facebook and Instagram caption

Content gets easier when every video has a job. Start with one person, one useful promise, and one next action you can measure.

## Recording and editing direction

Direct to camera. Use the right side background. Point to each of the three lines only after saying it out loud. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  1,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'choose-one-outcome-you-can-honestly-deliver',
  'Choose One Outcome You Can Honestly Deliver',
  'Module One: Give the Content a Job. Turn broad expertise into a bounded course result without revenue, ranking, or virality promises.',
  $content_engine_lesson$# CE L02: Choose One Outcome You Can Honestly Deliver

## Module and purpose

Module One: Give the Content a Job. Turn broad expertise into a bounded course result without revenue, ranking, or virality promises.

## Main Teleprompter script

A course is not valuable because it has a lot of videos.

It is valuable because the buyer can finish something.

That distinction matters, because a lot of people build a course by counting how much they know. They keep adding modules, bonuses, interviews, downloads, and hours of talking. Then the buyer opens it, sees a mountain of material, and never gets to the first useful result.

We are not doing that here.

We are going to name one finished result.

For The Content Engine, the result is this.

The buyer leaves with one clear offer, thirty useful video topics, ten camera ready scripts, one repeatable recording setup, and one owned path from the videos to a page, form, or checkout.

That is a real package of work somebody can finish.

Now we draw the boundary.

This course does not promise that ten videos will go viral. It does not promise a certain number of views. It does not promise a Google ranking, a lead count, or a sale. Those outcomes depend on the market, the offer, the platform, the execution, the proof, and a whole list of things no honest teacher controls.

What this course can control is the system.

It can help you decide what to say. It can help you say it clearly. It can help you record efficiently. It can help you connect the attention to something you own. It can help you measure what happened instead of guessing.

That is enough value to charge for.

The price is not based on a fake claim that these templates are worth thousands of dollars. The founding price is one hundred twenty seven dollars because it is an accessible business purchase, it sits above a live introductory workshop, and it gives the buyer a complete operating system they can reuse.

After real buyers use it and the course is revised from actual questions, the regular price becomes one hundred ninety seven dollars.

No fake countdown. No made up retail value. No guarantee that the internet owes anybody attention.

Just a clear result, a fair boundary, and a price tied to useful work.

Your assignment is to finish this sentence.

By the end of my product, the buyer will have created, decided, or installed blank.

Then write three things you will not promise.

That boundary does not weaken the offer.

It is what makes the offer believable.

## Script metrics

Main script words: 398

Target pace: 115 words per minute

Estimated runtime: 3:28

## On screen hook

A course is not valuable because it has a lot of videos. It is valuable because the buyer can finish something.

## Lesson panel

Name the finished result

Draw the boundary

Price the useful change

## Assignment

Complete the outcome statement: By the end of this product, the buyer will have created, decided, or installed blank. Then list three outcomes you will not promise.

## Facebook and Instagram caption

The buyer does not need more hours of video. The buyer needs a result that is clear, useful, and honestly within your control.

## Recording and editing direction

Seated delivery with the left side background. Hold up one blank index card when you name the finished result. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  2,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'the-five-content-wells-already-inside-your-business',
  'The Five Content Wells Already Inside Your Business',
  'Module Two: Build the Topic Bank. Teach owners to find durable topics in real work instead of chasing daily trends.',
  $content_engine_lesson$# CE L03: The Five Content Wells Already Inside Your Business

## Module and purpose

Module Two: Build the Topic Bank. Teach owners to find durable topics in real work instead of chasing daily trends.

## Main Teleprompter script

Most business owners are not out of ideas.

They are standing on top of the ideas and calling it another workday.

A customer asks the same question for the fifth time. That is a video.

Somebody makes an expensive mistake because they misunderstood the process. That is a video.

You do one small thing differently from everybody else in your industry. That is a video.

The problem is not always creativity.

The problem is that nobody built a place to catch what the business is already teaching.

I use five content wells.

The first well is questions.

What do people ask before they buy? What are they embarrassed to ask? What do they ask after the work starts? What does somebody need to understand before the sales conversation even makes sense?

The second well is mistakes.

What do people do too early, too late, or in the wrong order? What looks cheaper but costs more later? What do people believe because somebody reduced a complicated problem to a slogan?

The third well is process.

Show how the work moves. Explain the first three steps. Explain what you inspect. Explain what you need from the customer. Explain what happens after somebody submits the form.

The fourth well is proof.

Proof does not mean you invent a testimonial or wave a revenue number around. Proof can be a working page, a before and after process map, a public source, an actual tool, a finished checklist, or a result you are allowed to show.

The fifth well is point of view.

What have you learned the hard way? What do you believe your industry gets wrong? What would you refuse to do even if it made the sale easier? What is the standard you want the customer to hold you to?

Those five wells are enough to keep a serious business talking for a long time.

Your assignment is to write five examples under each one.

Five questions.

Five mistakes.

Five process lessons.

Five pieces of proof.

Five points of view.

That gives you twenty five raw topics before you ever open a trend report.

Protect private information while you do it. Remove names, addresses, account details, health information, family details, and anything the customer did not authorize you to share.

Do not chase somebody else's personality.

Start with the work you already know.

The business has been handing you content all week.

This is where you start catching it.

## Script metrics

Main script words: 407

Target pace: 115 words per minute

Estimated runtime: 3:32

## On screen hook

Most business owners are not out of ideas. They are standing on top of the ideas and calling it another workday.

## Lesson panel

Questions

Mistakes

Process

Proof

Point of view

## Assignment

Write five real examples under each content well. Use customer language wherever possible and remove confidential details.

## Facebook and Instagram caption

Your next month of content is probably already inside the questions, mistakes, process, proof, and point of view your business produces every week.

## Recording and editing direction

Standing beside a whiteboard or the right side background. Count the five wells on your fingers. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  3,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'turn-one-offer-into-thirty-different-videos',
  'Turn One Offer Into Thirty Different Videos',
  'Module Two: Build the Topic Bank. Create a thirty topic matrix that varies purpose and hook instead of repeating the same sales speech.',
  $content_engine_lesson$# CE L04: Turn One Offer Into Thirty Different Videos

## Module and purpose

Module Two: Build the Topic Bank. Create a thirty topic matrix that varies purpose and hook instead of repeating the same sales speech.

## Main Teleprompter script

If all ten videos sound like the same pitch in a different shirt, the problem started before the camera came on.

You did not have ten ideas.

You had one idea and ten filenames.

Here is how we fix that.

In the last lesson, we built five content wells.

Questions.

Mistakes.

Process.

Proof.

Point of view.

Now we give each well six different shapes.

Shape one is the direct answer.

Ask the question the way the customer asks it, then answer it plainly.

Shape two is the mistake.

Show what goes wrong, why it goes wrong, and the safer next move.

Shape three is the checklist.

Give the viewer three to five things to inspect, gather, or decide.

Shape four is the story.

Use one real scene from your work or life that explains why the lesson matters. Keep private people private and do not improve the story with invented details.

Shape five is the comparison.

Compare two choices, two processes, or two outcomes. Make the comparison fair. Name what each option is good for and where it fails.

Shape six is the next move.

Tell the viewer the first action to take after the video.

Now do the math.

Five content wells multiplied by six useful shapes gives you thirty angles.

The question well becomes a direct answer, a common mistake, a checklist, a story, a comparison, and a next move.

Then you do the same thing with process, proof, and everything else.

This is how one offer creates a month of content without every video feeling like the same advertisement.

The matrix also helps you change the emotional temperature.

One video can be practical. One can be reflective. One can be a screen demonstration. One can use a physical object. One can be a direct answer with no music and no dramatic edit.

Your assignment is to fill the whole matrix.

Do not worry about writing scripts yet.

Just write one clear title in each box.

When you are finished, circle the ten topics that answer the most urgent questions, show the strongest proof, or lead most naturally to your offer.

Those ten circles become the first recording sprint.

That is the difference between batching content and repeating yourself.

We are building variety before we ever press record.

## Script metrics

Main script words: 380

Target pace: 115 words per minute

Estimated runtime: 3:18

## On screen hook

If all ten videos sound like the same pitch in a different shirt, the problem started before the camera came on.

## Lesson panel

Five content wells

Six useful shapes

Thirty distinct angles

## Assignment

Complete the thirty topic matrix by combining each of the five content wells with each of the six useful shapes.

## Facebook and Instagram caption

Five content wells multiplied by six useful shapes gives one offer thirty distinct videos without pretending every post needs a brand new idea.

## Recording and editing direction

Use the left side background. Point across the matrix. Insert a screen capture of the completed worksheet after the opening. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  4,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'write-the-first-ten-seconds-before-the-rest',
  'Write the First Ten Seconds Before the Rest',
  'Module Three: Write for a Human Voice. Create clear hooks that identify the subject and reason to keep listening without outrage bait.',
  $content_engine_lesson$# CE L05: Write the First Ten Seconds Before the Rest

## Module and purpose

Module Three: Write for a Human Voice. Create clear hooks that identify the subject and reason to keep listening without outrage bait.

## Main Teleprompter script

The first ten seconds do not need fireworks.

They need a reason to keep listening.

That sounds simple, but a lot of people write the whole video and treat the opening like an advertisement they can glue on later.

Then the hook is louder than the lesson, or it promises something the video never delivers.

We are going to do it in the right order.

Write the first ten seconds before the rest.

A useful hook does three jobs.

It names the problem.

It creates a real gap.

It earns the next sentence.

Here is an example.

If your website gets traffic but nobody fills out the form, check this before you buy another ad.

The problem is clear. Traffic is arriving and the form is not producing action.

The gap is clear. There is something to inspect before spending more.

The next sentence has a job. It has to tell the viewer what to inspect.

Now compare that with this.

You will never believe this insane website secret.

That may be loud, but it does not respect the viewer and it does not tell them what the video is about.

Use different hook shapes across the batch.

Start with a hard admission.

I wasted months posting without giving the traffic anywhere useful to go.

Start with a visible object.

Look at this empty form notification. This is what a broken customer path looks like.

Start with a question.

What happens after somebody sends you a direct message at nine o'clock at night?

Start with a contradiction.

More attention can make a broken sales process more expensive.

Start with a direct instruction.

Before you record another video, write the page it will send people to.

Your assignment is to write three opening lines for each of the ten topics you circled.

That gives you thirty possible hooks.

Read every one out loud.

Keep the clearest one, not the cleverest one.

Then ask one final question.

Does the rest of the video actually pay off what the hook promised?

If the answer is no, fix the lesson or fix the opening.

Attention is borrowed.

The next sentence has to earn it.

## Script metrics

Main script words: 360

Target pace: 115 words per minute

Estimated runtime: 3:08

## On screen hook

The first ten seconds do not need fireworks. They need a reason to keep listening.

## Lesson panel

Name the problem

Create a gap

Earn the next sentence

## Assignment

Write three hook versions for each of the ten circled topics. Keep the clearest one, not the loudest one.

## Facebook and Instagram caption

A useful hook names the problem, creates a real gap, and earns the next sentence. It does not need manufactured outrage.

## Recording and editing direction

Tight direct to camera. No music for the opening. Use the right side background after the hook lands. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  5,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'use-ai-without-sounding-like-ai',
  'Use AI Without Sounding Like AI',
  'Module Three: Write for a Human Voice. Teach a source and voice workflow that turns spoken expertise into readable scripts without generic filler.',
  $content_engine_lesson$# CE L06: Use AI Without Sounding Like AI

## Module and purpose

Module Three: Write for a Human Voice. Teach a source and voice workflow that turns spoken expertise into readable scripts without generic filler.

## Main Teleprompter script

Artificial intelligence should help you say what you mean.

It should not replace your voice with somebody from a software brochure.

You know the kind of writing I mean.

Everything is a journey. Every tool is revolutionary. Every business is unlocking its potential. The paragraphs sound polished, but no real person would say them standing in a yard or sitting across from a customer.

The fix starts before the prompt.

Speak the raw brief.

Open a voice note and explain the topic the way you would explain it to one person who actually needs the answer.

Tell the story. Correct yourself. Say what makes you mad. Say what you are not sure about. Name the source. Name the part you do not want exaggerated.

Then give the AI a real job.

Tell it who the audience is, what the video must accomplish, how long it should be, what source controls the facts, what language you do not use, and what the viewer should do next.

Do not ask it to make the video viral.

Ask it to make the point clear.

The second rule is to ground every claim.

If you are teaching from experience, say that it is your experience.

If you are describing a customer result, make sure you have permission and the result is documented.

If you are talking about a court filing, a public official, a platform rule, a price, or a technical feature, reopen the current source before recording.

AI can organize evidence. It cannot turn a guess into a fact.

The third rule is to read the draft out loud.

Your mouth will find bad writing faster than your eyes.

If you run out of breath, shorten the sentence.

If the same point appears three times, keep the strongest version.

If you hit a phrase you would never say, replace it with the words you just used while complaining about it.

Remove dash punctuation from the spoken script. Use a period, a comma, or a new paragraph. Make the pause visible.

Your assignment is to record a three minute voice note teaching one topic.

Use the prompt in the workbook to create a draft.

Then remove every sentence you would never say out loud.

The goal is not to hide that a tool helped.

The goal is to make sure the tool helped Ryan, or helped you, sound more like the person who actually knows the work.

## Script metrics

Main script words: 403

Target pace: 115 words per minute

Estimated runtime: 3:30

## On screen hook

Artificial intelligence should help you say what you mean. It should not replace your voice with somebody from a software brochure.

## Lesson panel

Speak the raw brief

Ground every claim

Read it out loud

## Assignment

Record a three minute voice note teaching one topic. Use the provided prompt to create a draft, then remove every sentence you would never say out loud.

## Facebook and Instagram caption

AI should organize your thinking, protect the source, and make recording easier. It should not replace your voice with generic copy.

## Recording and editing direction

Seated beside a laptop. Use the left side background. Show a short before and after script crop with private details removed. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  6,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'build-a-recording-setup-you-can-repeat',
  'Build a Recording Setup You Can Repeat',
  'Module Four: Build the Recording Station. Reduce production friction with a simple camera, microphone, teleprompter, light, background, and file naming system.',
  $content_engine_lesson$# CE L07: Build a Recording Setup You Can Repeat

## Module and purpose

Module Four: Build the Recording Station. Reduce production friction with a simple camera, microphone, teleprompter, light, background, and file naming system.

## Main Teleprompter script

The best recording setup is not the one that looks impressive.

It is the one you can rebuild tomorrow without losing an hour.

I recorded outside today and changed the background for each video. That created variety, but the system stayed the same.

The camera stayed stable.

The microphone stayed connected.

The Teleprompter stayed readable.

The file naming stayed in order.

That is what made the next video easier than the first one.

Your recording station needs four things.

First, a stable camera.

Use the camera you already have if it produces a clear image. Put it at eye level. Clean the lens. Lock the orientation before you begin. For Reels and short vertical lessons, record in nine by sixteen. Leave safe space around your face and the main text.

Second, clear audio.

People will forgive an ordinary background before they forgive audio they cannot understand. Test the microphone. Listen for clothing noise, wind, air conditioning, and a connection that quietly switched back to the computer microphone.

Third, readable words.

The Teleprompter is there to keep the point organized. It is not there to make you stare through the viewer. Use large white text on black, a natural pace, and enough margin that your eyes do not race from edge to edge.

Load only the spoken script. Do not load the caption, editing notes, or word count.

Fourth, a repeatable scene.

That can be a porch, a desk, a blank wall, a workshop, or one of the lesson backgrounds in this course. The background should support the point. It should not compete with your face or display private information.

Before the real take, record twenty seconds.

Say the opening line at normal volume. Move your hands. Point toward the lesson panel. Stop the clip and watch it with sound.

Check framing, focus, microphone, background, and captions safe space.

Then name the file before the batch gets away from you.

Use the course ID, lesson ID, take number, and orientation.

Your assignment is to build one setup and photograph it.

Write down the settings that matter.

Tomorrow should not begin with another investigation into where the camera belongs.

Build the station once.

Then use it.

## Script metrics

Main script words: 364

Target pace: 115 words per minute

Estimated runtime: 3:10

## On screen hook

The best recording setup is not the one that looks impressive. It is the one you can rebuild tomorrow without losing an hour.

## Lesson panel

Camera

Clear audio

Readable words

Repeatable scene

## Assignment

Build and photograph one repeatable recording position. Save the camera, microphone, light, teleprompter, and background settings in the workbook.

## Facebook and Instagram caption

A useful studio is a setup you can rebuild quickly: stable camera, clear audio, readable words, and a scene that supports the lesson.

## Recording and editing direction

Demonstrate each physical item. Use the right side background only after the setup is visible. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  7,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'record-ten-videos-without-turning-it-into-ten-productions',
  'Record Ten Videos Without Turning It Into Ten Productions',
  'Module Four: Build the Recording Station. Run a safe, organized batch session with distinct scenes, controlled quality checks, and clear file states.',
  $content_engine_lesson$# CE L08: Record Ten Videos Without Turning It Into Ten Productions

## Module and purpose

Module Four: Build the Recording Station. Run a safe, organized batch session with distinct scenes, controlled quality checks, and clear file states.

## Main Teleprompter script

Ten videos should feel like one recording session.

They should not feel like ten separate film productions.

The reason batching works is that the expensive decisions happen once.

You choose the offer once.

You choose the audience once.

You prepare the scripts once.

You test the camera and microphone once.

Then you move through a controlled queue.

Start by preparing all ten scripts before you press record.

Every script needs a unique ID, title, hook, main point, closing action, and filename. Put them in the order you intend to record, but do not make every emotional or visual lane sit beside its twin.

Move from a practical lesson to a story. Move from a desk lesson to a standing lesson. Change the background, angle, hat, or prop when it helps the viewer feel a real difference.

Then record in sets.

I like three, three, and four.

Record the first three. Stop. Check the files. Drink water. Check the microphone and focus again. Then record the next set.

That break keeps one small equipment problem from ruining ten takes.

Do not watch the entire lesson after every take unless something felt wrong. Check the opening, one section in the middle, and the final line. Confirm the audio waveform and the saved file size. Then move forward.

Keep the file states honest.

A script is not a recording.

A stopped recording is not a saved file.

A saved file is not an edited export.

An edited export is not a published video.

Name the state so you do not lose work or claim something exists before it does.

The download or transfer may become the slowest part. Let that happen in the background when the software supports it safely. Do not delete the camera original until the copied file opens and the backup is verified.

If a subject causes real physical distress, stop. The course does not need manufactured emotion. Take the pause, switch lessons, or end the session.

Your assignment is to prepare ten scripts, then record the first three.

Verify every saved file before you continue.

Speed comes from removing repeated decisions.

It does not come from skipping the checks that protect the work.

## Script metrics

Main script words: 364

Target pace: 115 words per minute

Estimated runtime: 3:10

## On screen hook

Ten videos should feel like one recording session, not ten separate film productions.

## Lesson panel

Prepare the queue

Record in sets

Verify every file

## Assignment

Prepare a ten script queue, record the first three, and verify each saved file before continuing. Stop the session if equipment, focus, or physical strain changes.

## Facebook and Instagram caption

The batch gets fast when the decisions are made before recording: queue the scripts, work in sets, and verify every file before moving on.

## Recording and editing direction

Standing delivery with the left side background. Insert a safe screen capture of the numbered script queue and folder names. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  8,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'edit-fast-without-editing-the-life-out-of-it',
  'Edit Fast Without Editing the Life Out of It',
  'Module Five: Edit and Publish the Point. Teach a restrained CapCut workflow that protects clarity, readable captions, source visuals, and archive masters.',
  $content_engine_lesson$# CE L09: Edit Fast Without Editing the Life Out of It

## Module and purpose

Module Five: Edit and Publish the Point. Teach a restrained CapCut workflow that protects clarity, readable captions, source visuals, and archive masters.

## Main Teleprompter script

The edit has one job.

Remove the friction between the viewer and the point.

That means the edit is not a talent show.

You do not need an effect every two seconds. You do not need stock footage that has nothing to do with the lesson. You do not need music loud enough to compete with the sentence you spent all that time writing.

Start with the obvious cuts.

Remove the walk toward the camera. Remove the reach for the stop button. Remove the long reset after a mistake. Keep a natural breath when the thought needs it.

Then clean the audio.

Raise the voice to a consistent level. Reduce noise carefully. Listen on headphones and on the computer speaker. Do not process the voice until it sounds like it came through a telephone.

Next, add captions.

Captions need to be large enough to read on a phone. Keep them out of the platform controls. Break the sentence where a person would naturally read it. Correct names, websites, numbers, and any word the automatic caption system guessed wrong.

Then decide whether the lesson needs an overlay.

Use the worksheet when you refer to the worksheet.

Use the public article when you refer to the article.

Use the process map when the process becomes easier to understand by seeing it.

Do not cover the entire lesson with unrelated footage just because movement feels professional.

The viewer came to learn from the person who knows the work.

End with one clear card.

Name the next action and the exact website.

For this course, the card points to TheLeadFlowPro.com and The Content Engine page.

Save two files.

The archive master keeps the best available quality and the complete lesson.

The delivery export matches the platform, usually a vertical file with captions and the approved end card.

Open the export after it finishes. Watch the beginning and the end. Confirm the sound, captions, crop, and website spelling.

Your assignment is to edit one lesson with only the cuts and overlays it actually needs.

If an effect does not help the viewer understand, remove it.

The point should feel closer after the edit.

Not farther away.

## Script metrics

Main script words: 361

Target pace: 115 words per minute

Estimated runtime: 3:08

## On screen hook

The edit has one job: remove the friction between the viewer and the point.

## Lesson panel

Trim the waste

Make captions readable

Use proof on purpose

## Assignment

Edit one lesson with only the required cuts, captions, source overlays, and end card. Save the archive master and the delivery export as separate files.

## Facebook and Instagram caption

A useful edit removes dead time, protects the words, and shows proof when proof helps. It does not bury the lesson under effects.

## Recording and editing direction

Record beside a laptop with the right side background. Insert a CapCut screen recording with all private projects and filenames hidden. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  9,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'send-every-video-somewhere-you-own',
  'Send Every Video Somewhere You Own',
  'Module Five: Edit and Publish the Point. Connect rented-platform attention to one owned page, lead capture, checkout, or diagnostic with traceable calls to action.',
  $content_engine_lesson$# CE L10: Send Every Video Somewhere You Own

## Module and purpose

Module Five: Edit and Publish the Point. Connect rented-platform attention to one owned page, lead capture, checkout, or diagnostic with traceable calls to action.

## Main Teleprompter script

A million views on somebody else's platform can still leave you with nothing you own.

That is the danger of confusing attention with a business.

Facebook, Instagram, TikTok, YouTube, and X can introduce you to people you would never reach on your own. Use them. Learn them. Respect the format.

But do not build the whole customer relationship inside a feed you do not control.

Every video needs an owned destination.

That destination can be a focused landing page, a course page, a diagnostic, a booking page, a product page, or a useful article with the next action built into it.

The page should continue the exact conversation the video started.

If the video is about creating ten scripts, do not send the viewer to a homepage with twelve different buttons.

Send them to the ten video sprint page.

If the video is about a lead leak, send them to the diagnostic or audit.

If the video is about a documented article, send them to that source before asking for anything else.

Then give the page one clear action.

Buy the course.

Download the workbook.

Complete the diagnostic.

Book the map.

Ask the question.

One page can have supporting links, but the main decision should be obvious.

Now make the path traceable.

Use a source tag or campaign code so the visit tells you which video sent the person. Confirm the form preserves the source. Confirm the confirmation page loads. Confirm the email or message actually arrives. Confirm the checkout completes in the correct business account.

Do not infer that because a button exists the system works.

Test it from the public page like a customer.

For The Content Engine, the primary checkout belongs on TheLeadFlowPro.com under the Operator Academy. RealRyanNichols.com can tell the founder story and send interested owners to the course, but the course and payment path should stay under the business brand that teaches the system.

Your assignment is to map one destination for each of the first ten videos.

Then test the entire path.

Attention is rented.

The relationship should move toward something you own.

## Script metrics

Main script words: 349

Target pace: 115 words per minute

Estimated runtime: 3:02

## On screen hook

A million views on somebody else’s platform can still leave you with nothing you own.

## Lesson panel

One owned page

One clear action

One source you can track

## Assignment

Map the destination for each of the first ten videos. Add a source tag or campaign code and test the full path from the video link to the confirmation.

## Facebook and Instagram caption

Attention is rented. The page, customer relationship, and next action should move toward something your business controls.

## Recording and editing direction

Seated with the left side background. Show a simple flow from Reel to page to form or checkout to follow up. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  10,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'give-google-a-real-page-for-the-video',
  'Give Google a Real Page for the Video',
  'Module Six: Become Findable and Measurable. Translate each important lesson into an indexable public watch page with accurate metadata and no ranking guarantee.',
  $content_engine_lesson$# CE L11: Give Google a Real Page for the Video

## Module and purpose

Module Six: Become Findable and Measurable. Translate each important lesson into an indexable public watch page with accurate metadata and no ranking guarantee.

## Main Teleprompter script

Posting a video and building a page for that video are two different jobs.

The social post is built for the feed.

The watch page is built to give the lesson a permanent address.

Google's current guidance is straightforward.

If a video is important enough to be discovered as a video result, give it a dedicated watch page when that makes sense for the business.

The video should be the main reason the page exists.

Give the page a unique title and description.

Embed the video in a way Google can find in the rendered page.

Use a valid, stable thumbnail.

Keep the video file or player URL stable enough to be fetched.

Add structured data when the implementation supports it, and monitor the page in Search Console.

That does not guarantee a ranking or a video feature.

It makes the page eligible and understandable.

Now add the parts that help a human.

Write a short summary in plain English.

Include the transcript or a useful lesson outline.

Link the worksheet, article, source, or tool mentioned in the video.

Put the next action near the lesson instead of hiding it at the bottom of a generic website.

For a paid course, do not publish every full lesson for free. Choose two or three public lessons that solve a real problem and demonstrate the teaching style. The paid course can remain behind access control.

The public lessons become the search and trust layer.

The private lessons become the complete operating system.

Use accurate dates and claims. If the video discusses a current platform feature, price, law, or technical rule, review the page when the source changes.

Your assignment is to choose one free lesson and give it a real watch page.

Use a unique title, a summary, a transcript, a stable thumbnail, and the exact next action.

Then test the page on a phone and a desktop.

Run the structured data check if you added markup.

Request indexing only after the public page is ready.

The goal is not to trick Google.

The goal is to make one useful lesson easy for a person and a search engine to understand.

## Script metrics

Main script words: 359

Target pace: 115 words per minute

Estimated runtime: 3:07

## On screen hook

Posting a video and building a page for that video are two different jobs.

## Lesson panel

Dedicated watch page

Unique title and summary

Stable video and thumbnail

## Assignment

Publish one free lesson on a dedicated watch page with a unique title, summary, transcript, thumbnail, and source links. Validate the page before requesting indexing.

## Facebook and Instagram caption

If a video matters beyond today’s feed, give it a dedicated page, stable media, accurate text, and a clear next action on a site you own.

## Recording and editing direction

Desk delivery with the right side background. Insert a public browser demonstration of one approved watch page. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  11,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.lessons (
  course_id, slug, title, summary, content, video_url, sort_order, is_published
)
select
  id,
  'run-the-thirty-day-content-loop',
  'Run the Thirty Day Content Loop',
  'Module Six: Become Findable and Measurable. Turn the first batch into a measured operating rhythm that improves topics, pages, calls to action, and offers.',
  $content_engine_lesson$# CE L12: Run the Thirty Day Content Loop

## Module and purpose

Module Six: Become Findable and Measurable. Turn the first batch into a measured operating rhythm that improves topics, pages, calls to action, and offers.

## Main Teleprompter script

You do not need another burst of motivation.

You need a loop that tells you what to do next Monday.

The first ten videos prove that the recording system works.

The next thirty days teach you which subjects, hooks, pages, and offers deserve another round.

Use a five step loop.

Plan.

Record.

Publish.

Measure.

Improve.

During the planning block, review the customer questions, the topic bank, the current offer, and the last batch results. Choose the next ten topics before the recording day.

During the recording block, prepare the queue and work in sets. Keep the filenames and production states current.

During publishing, match each video to the right caption, source, page, and call to action. A draft is not a live post. Save the live URL when publication is verified.

During measurement, watch six numbers.

How many videos were recorded.

How many were edited.

How many were actually published.

How many qualified visits reached the owned page.

How many leads completed the next action.

How many verified sales completed.

Views matter, but they do not tell the whole story.

A video with fewer views may produce more useful visits because it reached the right person with the right problem.

Then improve one variable at a time.

Keep the topic and test a different hook.

Keep the hook and test a clearer page.

Keep the page and test a stronger explanation of the offer.

Do not change the topic, hook, video length, audience, page, price, and call to action all at once, then pretend you know what caused the difference.

You may eventually record five to ten videos every weekday. The system can support that volume when the source bank, editing capacity, storage, publishing review, and measurement are ready.

Do not use volume to outrun quality control.

The goal is not to flood the internet with noise.

The goal is to become consistently useful, consistently findable, and consistently connected to a business path you own.

Your final assignment is to schedule four weekly sprints.

Write the date, the ten topics, the recording block, the editing block, and the review block.

Then start the loop again.

You do not need to wonder what comes next.

The system tells you.

## Script metrics

Main script words: 368

Target pace: 115 words per minute

Estimated runtime: 3:12

## On screen hook

You do not need another burst of motivation. You need a loop that tells you what to do next Monday.

## Lesson panel

Plan

Record

Publish

Measure

Improve

## Assignment

Schedule the next four weekly sprints. Record the baseline for videos, completed edits, published links, page visits, leads, and verified sales.

## Facebook and Instagram caption

The content engine is a loop: plan, record, publish, measure, and improve. Keep the production states honest and let real behavior guide the next batch.

## Recording and editing direction

Walking or standing delivery with the left side background. End on a clean thirty day calendar. Keep the course background clear and leave room for vertical captions. Stop if physical or emotional strain becomes unsafe.

## Production status

Scripted and packaged. Teleprompter not touched. Not recorded. Not edited. Not published.$content_engine_lesson$,
  null,
  12,
  true
from public.courses
where slug = 'content-engine'
on conflict (course_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- Rollback is intentionally manual because learner progress and issued credentials
-- must not be deleted automatically.
-- update public.courses set is_published = false where slug = 'content-engine';
-- update public.lessons set is_published = false
-- where course_id = (select id from public.courses where slug = 'content-engine');
