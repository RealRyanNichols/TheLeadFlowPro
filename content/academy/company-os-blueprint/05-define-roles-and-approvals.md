# OS L05: Define Roles and Approvals

## What you will finish

Give each action an owner, permission level, reviewer, and escalation path. When you are done you will have a role matrix your whole team has read, one row per role, with the overlaps resolved and every consequential action pointed at a named approver with a limit.

## Why this matters

Picture a heating and air company in Tyler. A new customer service rep issues a $400 refund because nobody told her she could not. A tech deletes a lead by accident, and it is gone. The bookkeeper has the owner's Stripe login on a sticky note. And the owner approves everything personally, so on the days he is in an attic, nothing moves.

That is both failures at once. Too loose, and you get mistakes and exposure. Too tight, and you get a bottleneck with the owner's name on it. Most small businesses have both, in different corners.

Skip this and the workflows from lesson four have steps with no accountable owner. The control center in lesson six has an approvals panel with nobody behind it. And the security plan in lesson seven has no roles to enforce.

Bring the workflow specifications from lesson four. Every step on them needs a role, and every approval on them needs a limit and a person.

## The lesson

### 1. Use least privilege

A role matrix answers one question for every action in the business: who is allowed, who checks, and what happens if they do not.

Here is how it shows up in the systems I build. Roles are rows in Supabase: owner, admin, staff, tech, client. Row-level security decides which records each role can see and change. The admin back office shows different buttons to different roles. The client portal shows a client their own records and nothing else. Notion and ClickUp have workspace permissions per person. Stripe, Vercel, GitHub, and Google Workspace each have team roles, and every person has their own login. Nobody shares the owner account, ever.

Least privilege means everyone gets the access their job needs and nothing more. Start from zero and add. Do not start from everything and subtract.

List roles, not people. Owner, office manager, dispatcher, tech, bookkeeper, sales, client. For each role, write the data access: which records, read or write. Then the allowed actions and the prohibited actions, in plain words. "Tech: read projects assigned to them, write notes and photos on those projects, cannot see pricing, cannot see other techs' schedules, cannot delete anything."

Owners push back on this. It feels like distrust. It is not about trust. It is about the size of the mistake a person can make on a bad day, and the size of the damage if their phone gets stolen.

What good looks like: you could hand the matrix to a new hire on day one and they would know what they can touch.

The mistake is the shared admin login, and its cousin, giving the office manager the owner's access "for now" because it was faster. Two years later she still has it, and so does the person she trained.

### 2. Separate proposal from approval

When an action is consequential, the person who proposes it should not be the person who approves it. Refunds over a limit. Discounts. Deleting records. Changing prices. Sending a message to more than a handful of people. Paying a vendor. Publishing to the website. Changing who has access.

Set the limits in dollars and counts. "Staff can refund up to $100 without approval. Over that, the office manager. Over $1,000, the owner." Those are illustrative numbers. Use yours. Write the delegate for each approver, because approvers go on vacation. Write the escalation: what happens when the approver has not responded in four hours, or by end of day.

This is the same idea you built in AG L07 when you put approval around consequential agent actions. Now it applies to the humans too.

What good looks like: every consequential action has a proposer, an approver, a limit, a delegate, and a timer.

The mistake is the owner as the only approver for everything. Then one of two things happens. Everything waits, or people find a way around you, and you do not know which until it costs you.

Example: a church in Henderson lets the office administrator propose any spend, the treasurer approve up to a set amount, and two board members approve above it, with the finance chair as delegate. Nobody proposes and approves the same check.

### 3. Remove orphaned work

Orphaned work is any action with no owner, two owners, or an owner who left.

Take the workflow specifications from lesson four and walk every step. Is there a role on it? Not a name, a role. Names leave. When Tina quits, "Tina answers the Facebook inbox" becomes nobody answers the Facebook inbox, and you find out from a one-star review.

Then look for overlaps. Two roles that both think they respond to website leads is the same as zero, because each assumes the other did. Pick one, and make the other the backup with a rule for when they step in.

Set the review cadence. Quarterly, you read the matrix with every role owner and remove access that is no longer needed. When someone leaves, their access is gone the same day, before the goodbye lunch.

What good looks like: every step on every workflow points to exactly one role, and the matrix has a date on it for the next review.

The mistake is assigning to the person instead of the role, and then never reviewing. That is how a subcontractor from two years ago still has edit access to your website.

Run the prompt with your team and your five workflows in the bracket. Then sit with each role owner, read their row, and fix the overlaps in the room. That meeting is the assignment.

## Worked example

Neches Heating and Air in Tyler is a fictional example. The owner is Marcus. He has an office manager named Tina, a dispatcher, four techs, and a part-time bookkeeper who comes in on Thursdays.

Marcus runs the prompt:

"Build a role and approval matrix for owner, office manager, dispatcher, four techs, part-time bookkeeper; workflows: missed call to booked, quote to paid, paid to delivered, delivered to review, refund request. Include role, responsibilities, data access, allowed actions, prohibited actions, approval limits, delegate, escalation, and review cadence."

Example output:

```text
Role: tech. Access: assigned projects, read. Notes and photos, write. Prohibited: pricing, other schedules, deletion.
Role: office manager. Approval limit: refunds to $250. Delegate: owner. Escalation: owner after four hours.
Role: bookkeeper. Access: Stripe full, accounting full.
Action: delete lead. Allowed: all staff.
Action: change price sheet. Allowed: owner. Reviewer: none.
Review cadence: quarterly.
```

Marcus reads it against the pass standard. Do consequential actions have an accountable owner, and is sensitive access limited to need? Refunds are fine. Two rows are not. Deleting a lead is allowed for everyone, which is how the last one vanished. And the bookkeeper has full Stripe access when all she does is pull reports on Thursday.

The one revision: delete becomes a soft delete, admin only, with the record hidden instead of gone. The bookkeeper gets a read-only role in Stripe and her own login. Marcus also adds a reviewer for price sheet changes, Tina, because a typo on the price sheet goes out on every quote.

He reads each row to the person who holds the role. The dispatcher and Tina both thought they owned the Facebook inbox. Now Tina owns it and the dispatcher covers after 5 p.m. That passed.

## Exact working prompt

```text
Build a role and approval matrix for [team and workflows]. Include role, responsibilities, data access, allowed actions, prohibited actions, approval limits, delegate, escalation, and review cadence.
```

## Guided practice

1. List your roles, not your people, in the Role matrix section of the workbook.
2. Run the prompt with your team and your five workflows in the bracket.
3. Circle every action that costs money to get wrong and check it has a limit, an approver, a delegate, and an escalation timer.
4. Walk each step of your five workflows and write a role next to it, flagging any step with zero or two.
5. Book a thirty-minute meeting with every role owner to read their row and resolve the overlaps.

## Assignment and evidence

Review the matrix with every role owner and resolve overlaps.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Consequential actions have an accountable owner and sensitive access is limited to need.

## Common mistakes

- One shared admin login. Fix: every person gets their own account with their own role, and MFA on.
- Assigning to names. Fix: assign to roles, so the work survives the person leaving.
- Owner approves everything. Fix: set limits so routine actions clear without you, and only the big ones wait.
- Two roles on one inbox. Fix: one owner, one backup, and a written rule for when the backup steps in.
- No review date. Fix: quarterly access review on the calendar, and same-day removal when someone leaves.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Responsibility and approval grid.
**Screen recording:** The same lead opened in the admin back office as the owner, then as a tech, showing the buttons that appear and disappear by role, then the role matrix with the two overlap rows being merged into one owner and one backup.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Role matrix.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
