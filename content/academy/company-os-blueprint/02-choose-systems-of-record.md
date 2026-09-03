# OS L02: Choose Systems of Record

## What you will finish

Assign one authoritative home for customers, leads, projects, money, content, and decisions. When you are done you will have a signed-off source-of-truth matrix, one row per entity, and every duplicate spreadsheet and tool on your map marked as a copy or marked for retirement.

## Why this matters

A customer in Marshall changes her phone number. The office manager updates it in the CRM. The bookkeeper still has the old one in the accounting software, so the overdue invoice reminder goes to a dead number. The tech has the old one in his phone, so the "on my way" text goes nowhere. Three people updated three copies and the business still called the wrong number.

That is what happens when the same fact lives in more than one place with nobody in charge of it. You get four versions of Maria. You get the argument about which spreadsheet is right. And every dashboard you built in OA09 disagrees with itself, because each one reads a different copy.

Skipping this step is how a business ends up paying for six tools that each hold a fifth of the truth. It also makes the next lesson impossible. You cannot design tables until you have decided which system is the authority for what.

Bring the current-state map from lesson one. Every record you found on it gets a home in this lesson.

## The lesson

### 1. Define each entity

A system of record is the one place where a fact is true. Everything else is a copy. That is the whole idea, and it is the hardest rule in this course to keep, because every tool you buy wants to be the authority for everything.

Start by naming the things you keep records about. An entity is one of those things. Customers, leads, projects, money, content, and decisions are the six in the outcome. Your map from lesson one probably shows a few more, like vendors, employees, and equipment.

Write a one-line definition for each, and name its unique ID. "A lead is a person who asked us for something and has not paid us yet. ID: the lead number the CRM assigns." "A customer is a person or company with at least one paid invoice. ID: the customer number." Decide when a lead becomes a customer, because that moment is where most duplicates are born.

What good looks like: anyone on the team can read the definition and sort a real record into it without asking you.

The mistake is fuzzy words. "Contact" means four different things in most shops. A prospect, a customer, a vendor, and the tech's cousin who does drywall. Split them.

Example: a gym in Tyler had "members" in the gym software, "leads" in Instagram messages, and "trial passes" in a spreadsheet. All three were the same entity, a person, at three different statuses. One definition fixed three tools.

### 2. Choose one owner

For each entity, pick one authoritative system and one human owner. The system is where the truth lives. The owner is the person who settles conflicts and approves changes to the rules.

Here is how it works in the systems I build. One Supabase database is the authority for people, companies, leads, projects, and messages. The website writes to it. The admin back office reads and edits it. The client portal shows each customer their own slice of it. The dashboards count from the same tables. Notion or ClickUp hold the queues the humans work from, and every queue card carries the record's ID so it points back home. Stripe is the authority for payments. Your accounting software is the authority for the books. GitHub is the authority for the code and the site content. A decision log in Notion is the authority for why we did things.

You do not have to use my stack. You do have to make the same decisions.

Pick the system where the record is created most often, used most often, and kept safest. That is not always the fanciest tool. For a fence company in Gilmer, the authority for customers is the CRM, not the accounting software, because the accounting software only knows people who have been invoiced. Leads never lived there at all.

Write the source of creation next to each entity. Leads are created by the website form, the missed call, and the Facebook form. Customers are created when a lead's first invoice is paid. Projects are created when a quote is accepted. Update rules go here too. Who is allowed to change a customer's phone number, and does the change flow anywhere else?

What good looks like: every entity has exactly one authority. Not "mostly the CRM."

The mistake is two authorities. "Well, QuickBooks has the customers too." It has a copy. Mark it as a copy. If your bookkeeper argues, and she will, the conflict rule in step three is the answer.

### 3. Plan synchronization

Now list every downstream copy. The accounting software has customers. The phone system has contacts. The email tool has a list. Each copy gets three rules: which direction it flows, how often, and what happens on conflict.

The rule that keeps you sane is this: copies flow one way, from the authority out. If a copy needs to change, change the authority and let it flow. If the sync is manual, say so, name who does it, and say when. "Dana exports new customers to QuickBooks every Friday." Manual is fine if it is written down and owned.

The conflict rule is short. The authority wins. If the authority is wrong, fix it there, not in the copy.

Retention goes on the matrix too. How long you keep the record, and what happens when someone asks you to delete them. Marketing consent lives on the person record, where you put it in LC L04, and it is the authority for whether you can text or email. Have your attorney review the retention and deletion rules once and move on.

What good looks like: every copy on the matrix has an arrow pointing one direction, a schedule, and a name.

The mistake is two-way sync between two tools that each think they own the customer. That is how you get four Marias with three phone numbers, and no way to tell which one is real.

When you run the prompt, paste the business systems from your lesson one map into the bracket. Read the matrix it returns with the owner of each system in the room. Then take a marker to the map and circle every spreadsheet or tool that is now a copy or a duplicate.

## Worked example

Cherokee Lawn and Landscape in Henderson is a fictional example. The owner is Luis. He has two crews, customers in QuickBooks, this week's jobs on a whiteboard, a Google Sheet of recurring accounts, leads in Facebook Messenger and in texts to his phone, and quotes in a Word template on his laptop.

Luis runs the prompt with his systems in the bracket:

"Create a system-of-record matrix for QuickBooks, whiteboard, Google Sheet of recurring accounts, Facebook Messenger, personal texts, Word quotes, Google Calendar. For each entity name the authoritative system, owner, unique ID, source of creation, update rules, downstream copies, retention, and conflict resolution."

Example output:

```text
Entity: customer. Authority: QuickBooks. Owner: Luis. ID: QuickBooks customer name. Created: at first invoice. Copies: Google Sheet, Google Calendar. Conflict: QuickBooks wins.
Entity: lead. Authority: none identified. Owner: none. ID: none. Created: Messenger or text. Copies: none. Conflict: undefined.
Entity: project. Authority: whiteboard. Owner: crew lead. ID: none. Retention: erased weekly.
Entity: quote. Authority: Word file on laptop. Owner: Luis. ID: file name. Copies: none. Retention: until laptop dies.
```

Luis reads it against the pass standard. Does every important entity have one authority, a stable identifier, an owner, and a conflict rule? Customers do, sort of. The ID is a name, and names change. Leads have nothing. Projects live on a whiteboard that gets erased every Friday, which means his history is in a dumpster.

The one revision: a contacts table in a CRM becomes the authority for people and companies, with a real ID and a customer-since date. QuickBooks becomes a copy, updated every Friday by Luis, with the CRM ID typed into the customer memo field so the two can be matched. Leads go in the same table with a status. Projects get a projects table, and the whiteboard becomes a display, not a record. The Google Sheet is marked duplicate and retired once the projects table has a month of data.

That version passed.

## Exact working prompt

```text
Create a system-of-record matrix for [business systems]. For each entity name the authoritative system, owner, unique ID, source of creation, update rules, downstream copies, retention, and conflict resolution.
```

## Guided practice

1. List your entities from the lesson one map and write a one-line definition and ID for each in the Source-of-truth matrix section of the workbook.
2. Run the prompt with your business systems in the bracket and read the matrix row by row.
3. For every entity with two candidate authorities, pick one and write the reason in the margin.
4. Circle every spreadsheet, whiteboard, and tool on your map that is now a copy or a duplicate.
5. Get each system owner to initial their row.

## Assignment and evidence

Approve the matrix and mark every duplicate spreadsheet or tool.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every important entity has one authority, stable identifier, owner, and conflict rule.

## Common mistakes

- Naming the biggest tool as the authority for everything. Fix: pick the system where the record is created and used most, one entity at a time.
- Using a name as the ID. Fix: give every entity a number the system assigns and never reuses.
- Letting copies flow both ways. Fix: copies flow from the authority out, and edits happen at the authority.
- Skipping retention. Fix: write how long you keep each record and what deletion means, then have your attorney review it once.
- Approving the matrix alone. Fix: every system owner reads their row and initials it.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** One record with downstream views.
**Screen recording:** One contacts record open in the Supabase table editor, then the same person shown in the admin back office, the client portal, and a ClickUp queue card, all carrying the same ID, ending on the finished matrix with the duplicates circled.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Source-of-truth matrix.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
