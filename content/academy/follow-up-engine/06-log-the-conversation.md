# FU L06: Log the Conversation

## What you will finish

Record the promise, objection, status, owner, and next action after every meaningful exchange. You will have five past conversations turned into clean lead records, and a habit: sixty seconds of logging after every call, text thread, or email that mattered.

## Why this matters

The most expensive thing in follow-up is a promise nobody wrote down. "I told her I'd call Thursday with the revised number." Thursday comes, the owner is on a job, the office manager does not know a promise exists, and the lead learns that this business forgets.

The second most expensive thing is a note that cannot be used. "Talked to Mike, seemed interested, follow up." Follow up on what? When? Which Mike? What did he object to? The next person has to reread the whole text thread, or call Mike back and ask him to repeat himself, which is worse than no call at all.

Picture a heating and air company in Longview. The owner takes a call at a job site about a system replacement. Great call. The customer wants a quote, mentioned her husband wants to compare a heat pump, and said "don't text me, call me, and not before nine." The owner writes "Rhonda, system replacement, call back" on a receipt. Two days later the office manager texts her at 8:15 am. Everything the owner learned is gone, and the customer just learned they do not listen.

You have been sending messages since lesson two and handling objections since lesson five. Every one of those exchanges creates facts that go stale in your head within a day. This lesson puts them in the record from LC L07, in a form the next person, or the automation, can act on. Lesson seven measures what is in that record, so the record has to be right.

## The lesson

### 1. Capture facts

A fact is something the lead said or did. Not what you think it meant. Start there.

Right after the exchange, while it is fresh, write down: what they asked for, what they told you about their situation, what they objected to, what you promised, what they promised, and any change in how they want to be contacted. That last one is a consent change and it is the most important line you will write. "Don't text me" gets recorded as text consent: no, today, from her, on the phone. It changes the record, not just your memory.

Sources for facts: Quo keeps the text thread and the call log, and it can give you a voicemail or call transcript to pull from. Email is already written down. For in-person conversations, dictate into your phone in the truck before you drive off.

Then run the prompt. Paste the raw notes or the transcript and it returns the fields: facts, stated need, objections, promises made, consent changes, stage, next action, owner, due date. It is a formatter, not an oracle. It cannot know what you did not tell it, so the dictation has to carry the details.

What good looks like: each fact could be read back to the lead and they would say "yes, I said that." The mistake: writing "seemed interested." That is not a fact. "Asked for a quote on a 3-ton system and said her husband wants to compare a heat pump" is a fact.

### 2. Separate notes from inference

Inference is your read on it. "She seemed price sensitive." "I think the husband is the decision maker." Inference is useful. It is also wrong a lot, and when it sits next to facts it starts looking like a fact.

So mark it. The prompt says mark every inference as inference, and I mean the word. "Inference: husband may be the decision maker, based on her saying he wants to compare options." Anyone reading later knows what was said and what was guessed.

Why this matters for automation: in lesson eight, some of the record will drive automatic sends. An automatic send based on a guess is how a customer gets a "since you're ready to move forward" email when they said no such thing. Facts drive automation. Inference drives human judgment.

Here is the split I use in the record. A facts field: quotes and events only. A notes field: inference and context, each line starting with "Inference:". A consent block: email, call, text, each yes or no with a date and a source. Nothing else goes in consent. If you are on Supabase, these are columns in the leads table. If you are on a sheet or Notion, they are columns there. Same structure either way, and the structure is what makes lesson seven possible.

What good looks like: a stranger could read the record and tell which lines are proof and which are opinion. The mistake: "customer is ready to buy" written as a fact because you felt good after the call. Feelings go in notes, labeled.

### 3. Set the next action

Every record ends with one next action, one owner, and one due date. If any of the three is missing, the conversation is not logged. It is parked.

The next action is a verb and an object. "Send revised quote with heat pump option." "Call after 9 am Friday." "Wait for her to send photos." Even waiting is an action, with a due date for when you stop waiting.

The owner is a name, not a role. The due date is a date, not "this week." And the stage is one of a short list you set once: new, contacted, quoted, negotiating, booked, won, lost, closed no response. Do not invent stages per lead.

When the due date arrives, the next action becomes the reminder. That is what the automation in lesson eight will actually do for you: not send the message, but put the human task in front of the human on the right day. In Supabase it is a query on the due date. In ClickUp or Notion it is a task with a date. Either way, the record drives the reminder, and the reminder drives the human.

What good looks like: a new team member opens the record cold and knows exactly what to do next and when. The mistake: next action "follow up." Follow up how? About what? The whole point of this course is that "follow up" is not an action.

Do this after every meaningful exchange. Not every "ok thanks" text, but every call, every objection, every promise. Sixty seconds. It is the cheapest sixty seconds in your business.

## Worked example

Cool Pines Heating and Air in Longview is a fictional example. Owner plus a two-man install crew, with an office manager who handles scheduling. Input: the owner's phone dictation after a job-site call, pasted raw:

"Talked to Rhonda Baker on Elm street about replacing the 3 ton unit, 14 years old, she wants a quote, husband wants to see heat pump option too, she said dont text her call her and not before 9, I said I'd have numbers Thursday, she asked about financing I said we have it through the supplier, she seemed pretty ready."

He ran the prompt with those notes pasted in place of [paste notes].

Example output:

```text
Facts: requested a replacement quote for a 3-ton unit, about 14 years old. Asked for a heat pump option for her husband to compare. Asked about financing.
Stated need: replace an aging unit; compare a heat pump; understand financing.
Objections: none stated. Inference: the financing question may signal budget sensitivity.
Promises made: owner to deliver both quotes Thursday.
Consent changes: text: no (stated on the call, today). Call: yes, after 9 am only.
Stage: quoted-pending. Next action: send both quotes and a financing summary. Owner: [owner name]. Due: Thursday.
Inference: "seemed pretty ready" is the owner's read, not a statement by the lead.
```

Review against the pass standard: can the next person continue without guessing or rereading? Almost. The office manager reading this knows not to text, knows not to call before nine, and knows what was promised and when. One gap: "Elm street" and no phone number made it into the output, so she could not act without going back to the dictation.

The one revision: the owner added the phone number and the full address to the facts field and set the owner to his own name, since he made the promise. He also changed the stage from "quoted-pending," which was not on his list, to "contacted," with the Thursday action moving it to "quoted." Then he did the same for four more calls from the week and found two promises he had forgotten.

## Exact working prompt

```text
Turn these conversation notes into a CRM update: [paste notes]. Return facts, stated need, objections, promises made, consent changes, stage, next action, owner, and due date. Mark every inference as inference.
```

## Guided practice

1. Pick five conversations from the past two weeks: two calls from your Quo log, two text threads, one email.
2. Paste the raw notes or transcript for the first one into the exact prompt.
3. Check the consent changes line against what the person actually said, then update the consent fields in your record.
4. Rewrite any next action that is not a verb, an object, an owner, and a date.
5. Repeat for the other four and set each due date as a reminder in your task tool.

## Assignment and evidence

Process five past conversations into clean lead records.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

The next person can continue the conversation without guessing or rereading a transcript.

## Common mistakes

- "Seemed interested" written as a fact. Fix: quote what they said, and put your read in notes labeled inference.
- A consent change kept in your head. Fix: change the consent field the same day, with the date and the source.
- Next action "follow up." Fix: verb, object, owner, date.
- Stages invented per lead. Fix: one short list of stages, set once, used everywhere.
- Logging tomorrow. Fix: sixty seconds right after the exchange, dictated if you are driving.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Conversation to CRM record.
**Screen recording:** Screen record a Quo call transcript on one side and the prompt output on the other, then the Supabase leads row (or sheet row) being updated field by field, ending on the consent columns.
**Course map:** the course visual below anchors where this lesson sits.

![The Follow-Up Engine course visual](/images/academy/follow-up-engine.svg)

## Downloadable

[Open the Follow-Up Engine workbook](/downloads/operator-academy/follow-up-engine-workbook.pdf)

Workbook section: OA05 Follow-Up Workbook, Conversation log.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
