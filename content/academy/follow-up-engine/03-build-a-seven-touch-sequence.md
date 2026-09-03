# FU L03: Build a Seven-Touch Sequence

## What you will finish

Create a short sequence that adds value instead of repeating the same ask. You will have a seven-row sequence planner, one row per touch with day, channel, purpose, message, value added, call to action, and stop condition, ready to load into Resend and your reminder list.

## Why this matters

One message is not follow-up. It is a reply. Real follow-up is what happens after they read the first response, meant to answer, and got pulled into a customer emergency, a kid's practice, a Tuesday. In my experience the businesses that follow up more than twice, respectfully, win work their competitors gave up on.

The trap is that most sequences are the same message seven times. "Just following up." "Checking in." "Bumping this." Each one says: I have nothing new, please reply anyway. By touch three you are noise. By touch five you are spam and they hit report.

Here is the scene. A gym in Tyler gives away a starter plan. Say two hundred people download it over a month. The gym emails each one "ready to join?" five days in a row. A dozen unsubscribe. Two complain. Nobody joins. Same gym, different sequence: day one deliver the plan, day three answer the most common question, day five a short video of a first session, day eight an invitation. Each touch earned the next one.

You wrote the first response in lesson two. That is touch one. This lesson builds touches two through seven. Lesson four handles what to do when none of them get an answer.

## The lesson

### 1. Give each touch a job

Before you write a single message, write the job of each touch in three words. If two touches have the same job, one of them goes.

Here is the ladder I use for most local businesses. Touch one: deliver and confirm. You built this in lesson two. Touch two: answer the question they have not asked yet. Touch three: show, do not tell. A photo, a short video, a before and after. Touch four: make the next step smaller. Touch five: address the most common objection head on. Touch six: a real reason to decide now, if one exists. Touch seven: close the loop and leave the door open.

Assign days. Day 0, 2, 4, 7, 10, 14, 21 is a reasonable spread for a quote or a download. Purchases move faster. Missed calls are mostly phone and done inside two days. Your trigger map from lesson one tells you the pace.

Assign channels, and go back to consent every time. Email can carry all seven touches for anyone who gave you their email for that request. Texts only go to people who checked the text box, and a human sends them from Quo, inside quiet hours, 8 to 8 local. Calls are human too. So a typical sequence is five emails from Resend, one or two human calls, and one or two human texts. Automation carries the email and creates the reminder for the human. The human does the human part.

Now write the value added column. This is the test. What does the person get from this touch even if they never buy? A checklist. A price range. A photo. An answer. If the column says "reminder," that touch has no value. Cut it or fix it.

What good looks like: you could read the value column alone and it would look like a helpful little course. The mistake: writing seven messages first, then trying to justify them. Jobs first, messages second.

### 2. Vary the question

Each touch ends with one action, same as lesson two. The trick is that it cannot be the same action seven times.

"Want to book?" seven times is a wall. Instead, rotate the kind of question. Touch two: "Which of these three matters most to you?" Touch three: "Want me to send the version for your situation?" Touch four: "Does Thursday or Saturday work for a fifteen-minute look?" Touch five: "Is it the price, the timing, or something else?" Touch six: "Should I hold the spot?" Touch seven: "Should I close this out, or check back in a month?"

Notice what each question does. It gives them a way to answer that is not yes or no. A person who is not ready to buy can still tell you what matters most, and now you are talking.

Vary the length too. If touch two is six lines, touch three should be two lines and a photo. Long, short, long, short. It reads like a person, because a person wrote it.

What good looks like: no two calls to action in your table are the same sentence. The mistake: every touch asks for the meeting. Ask for the meeting twice in seven, three times at most. The rest ask smaller questions.

### 3. Stop when the goal is reached

The sequence exists to get one of four outcomes: a reply, a booking, a purchase, or a clear no. The moment any of those happens, the sequence stops. Every remaining touch is cancelled, not delayed.

This is where the record from LC L07 earns its keep. Before each touch sends, it checks the record. Status still open? Consent for this channel still yes? No reply since the last touch? Then send. Otherwise stop. In Resend that means the automation checks a field before each send. In a simpler setup it means your Monday review of the lead table removes anyone who moved.

Write the stop condition on every row. Not once at the bottom. Every row. "Stop if replied, booked, purchased, or opted out" on rows two through seven. Row seven adds "sequence complete, status to closed, no response."

Quiet hours apply to sends too. Email can go at 7 am. A human text cannot. A human call cannot. Schedule the reminders for the human inside business hours.

What good looks like: you can trace any single message back to a row, and any row back to a rule that would have stopped it. The mistake: "the sequence keeps going until they buy." That is not a sequence. That is harassment with a schedule. Seven touches, then close the loop, and lesson four shows you how.

One more cut before you submit. Read the table top to bottom and delete any touch where the value column is weak. If a row cannot be fixed, replace it with something real or leave the gap. Six good touches beat seven with a filler.

## Worked example

Rose City Fitness in Tyler is a fictional example. Small gym, two trainers. Trigger: a download of their "First Two Weeks" starter plan. Offer: a 21-day intro membership. Consent captured on the form: email yes for the download, text optional, and most people leave it unchecked.

The owner ran the prompt with the offer and trigger filled in:

"Create a seven-touch follow-up sequence for a 21-day intro membership after a starter plan download. For each touch include day, channel, purpose, message, value added, call to action, and stop condition. Respect channel consent and quiet hours."

Example output (rows two through four, condensed):

```text
Touch 2, day 2, email. Purpose: answer the first question. Value: the three mistakes beginners make in week one. CTA: which one sounds like you? Stop: reply, booking, purchase, opt-out.
Touch 3, day 4, email. Purpose: show the room. Value: 40-second phone video of a first session, no music, real members. CTA: want to see the schedule? Stop: same.
Touch 4, day 7, human call if phone consent, otherwise email. Purpose: make it small. Value: a free first session, no membership required. CTA: Thursday or Saturday? Stop: same.
```

Review against the pass standard. Distinct purpose per touch: yes. Stops on reply, opt-out, booking, purchase: yes, on every row. One problem: touch six read "Last chance, intro price ends Friday." The gym has no Friday deadline. That is invented urgency, and it fails the spirit of the standard even if it passes the letter.

The one revision: touch six became "The intro runs 21 days from whenever you start, so there is no deadline from me. If you want the Monday start, say so and I will hold a spot." True, low pressure, and still a reason to decide. The touch that got cut was the original touch five, a second "ready to join?" with nothing new in it. It was replaced with a plain answer to the objection the trainers hear every week, "I have not worked out in years." Seven touches, every one with a job.

## Exact working prompt

```text
Create a seven-touch follow-up sequence for [offer and trigger]. For each touch include day, channel, purpose, message, value added, call to action, and stop condition. Respect channel consent and quiet hours.
```

## Guided practice

1. Bring your first response from lesson two and label it touch one, day 0.
2. Write the three-word job for touches two through seven before any message text.
3. Run the exact prompt with your offer and trigger and paste the table into the Sequence planner.
4. Mark the channel on each row against your consent fields, and move any text or call to a human reminder.
5. Delete or replace any row where the value column says "reminder" or "check in."

## Assignment and evidence

Build the sequence in a table and remove any touch that adds no new value.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Each touch has a distinct purpose and the sequence stops on reply, opt-out, booking, or purchase.

## Common mistakes

- Seven versions of "just checking in." Fix: write the value column first and cut any row that has none.
- The same call to action on every row. Fix: rotate between preference questions, small steps, and the booking ask.
- Automated texts in the sequence. Fix: texts and calls become human reminders; automation sends email.
- One stop condition written at the bottom. Fix: every row carries its own stop rule and the record is checked before each send.
- A deadline you made up. Fix: only use a date that is real, or drop the urgency and ask a smaller question.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Seven-touch value ladder.
**Screen recording:** Screen record the Sequence planner being filled row by row, then the Resend dashboard with the email touches scheduled and a ClickUp or Notion reminder list holding the human call and text touches.
**Course map:** the course visual below anchors where this lesson sits.

![The Follow-Up Engine course visual](/images/academy/follow-up-engine.svg)

## Downloadable

[Open the Follow-Up Engine workbook](/downloads/operator-academy/follow-up-engine-workbook.pdf)

Workbook section: OA05 Follow-Up Workbook, Sequence planner.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
