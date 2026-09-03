# OS L07: Secure and Recover

## What you will finish

Plan identity, roles, secrets, backups, audit trails, incident response, and continuity. When you are done you will have a completed risk register with an owner and an action on every row, and one restore or continuity test on the calendar with a name and a date.

## Why this matters

The person who knew the domain registrar password quit in March. The Stripe key is in a Slack message from two years ago. The customer list has never been backed up anywhere but the tool it lives in. And the owner's personal Gmail is the login for everything, with no second factor, because it was faster that way in year one.

None of that is a hacker story. It is a Tuesday. A lost phone, a fired employee who still has access, a table deleted by accident, a domain that expired because the card on file did too. Those are the ways a small business actually loses the customer list it spent ten years building.

Skip this and everything else in the course is standing on sand. The system of record from lesson two is only worth what you can restore. The roles from lesson five are only real if the logins enforce them.

One thing up front. I am not a security professional. This lesson gets you to the basics that stop the common disasters. When I say flag it, that means bring in someone who does this for a living. The prompt asks for those flags on purpose.

## The lesson

### 1. Inventory risks

Here is how the stack I build handles this, so you can compare it to yours. Logins live in Supabase auth, with roles enforced by row-level security. Secrets, meaning the API keys for Stripe, Quo, and Resend, live in Vercel environment variables and never in the code. The code lives in GitHub, which means the website itself is backed up by default. Supabase takes database backups on paid plans, and you should check exactly what your plan includes. Every account, Google Workspace, GitHub, Vercel, Supabase, Stripe, the domain registrar, has MFA on and one login per person. Production and test are separate projects so nobody practices on live customers.

Your stack may be different. The layers are the same.

The risk register is a table, one row per asset. Asset, what it holds, who has access, how it is backed up, the worst realistic day, how likely, how bad, who owns it, and the action.

Start with identity. List every login the business has. Every one. Then mark whether MFA is on and whether it is a shared account. The shared ones and the no-MFA ones go to the top of the register.

Then secrets. Every API key and every password to a system, where it is stored, and who can see it. If the answer is "in a text thread," write that down. It is the finding.

Then vendor access. The old web guy. The agency. The nephew who set up the Facebook page. Anyone outside the business with access to anything.

Then privacy. What personal data you hold and why, from the classification you did in lesson three. If you hold something you do not need, deleting it is the cheapest security you will ever buy.

What good looks like: you can answer, for every system, what happens if the owner is unreachable for a week.

The mistake is only thinking about hackers. Most rows on the register will be boring, and boring is what you can actually fix this month.

### 2. Layer prevention and detection

Prevention is the list you already know and have not finished. MFA on everything. One account per person. Least privilege from lesson five, enforced in the tool. Secrets in environment variables, not in code or chat. Domain auto-renew on a card that will not expire. Production separate from test. Access removed the same day someone leaves.

Detection is the part most small businesses have none of. Turn on the logs you already pay for: Supabase logs, Vercel logs, Stripe events. Set an alert for logins from a new device on the accounts that matter. Set an alert for a failed payment webhook, because a failing webhook means orders are being paid and not recorded. Set an alert when someone exports a large list, because that is what a departing employee does on their last day.

Audit trails are the event history from lesson three. Every status change with who and when. That is your audit trail. You built it already. Now you know why.

What good looks like: every row on the register has one prevention and one detection next to it.

The mistake is prevention only. A lock on the door and no way to know it was opened.

Example: a bookkeeping firm in Kilgore turns on new-device login alerts for the two accounts that can reset everything else, email and the domain registrar, before it touches anything more advanced. Those two are the keys to the building.

### 3. Practice recovery

A backup nobody has restored is a hope. Schedule a restore test. Take the most recent backup, restore it into a test project, and count. Does the number of customers match? Do the last ten orders show up? Write the date and the result on the register. Do it again next quarter.

Then the incident basics, written on one page. Severity: level one is customer data exposed or money moving where it should not. Level two is a system down. Level three is something odd that needs a look. Containment for each: revoke the keys, reset the passwords, take the form offline, pause the ads. Communication: who tells customers, when, and in what words. Have your attorney review the customer notification template once, before you need it.

Continuity is the other half. If the CRM is down for a day, how do you take calls and run jobs? Quo still rings. A paper intake form in every truck. A printed schedule on Monday mornings. Cheap, and it means a bad day stays a bad day instead of a lost week.

Now the flags. If you suspect customer data was exposed, flag it. If you handle card numbers anywhere outside Stripe, flag it and stop. If you are in a regulated field, medical, legal, financial, flag the whole plan for review. Bring in a security professional for those. This lesson does not replace one.

What good looks like: a thirty-minute tabletop where you read the incident page out loud and each person says what they would do.

The mistake is a plan in a document nobody has read. The tabletop is the fix, and it costs half an hour.

Run the prompt with your stack in the bracket. Read the flagged items first. Then fill the register and put one test on the calendar.

## Worked example

Sabine Valley Plumbing in Kilgore, the fictional example from lesson one, now runs on a site on Vercel, a Supabase database with an admin back office, GitHub, Stripe, Quo, Resend, Google Workspace, a domain at a registrar, and QuickBooks.

Travis runs the prompt:

"Create a practical security and recovery plan for Vercel, Supabase, GitHub, Stripe, Quo, Resend, Google Workspace, domain registrar, QuickBooks. Cover identity, MFA, roles, secrets, environment separation, logging, backups, restore tests, vendor access, privacy, incident severity, containment, communication, and continuity. Flag items needing a security professional."

Example output:

```text
Identity: Google Workspace, 5 users, MFA on for 2. Domain registrar on owner's personal email, no MFA. Flag: single point of failure.
Secrets: Stripe secret key in Vercel environment variables. Quo API key found in a shared Google Doc. Action: rotate and move.
Backups: Supabase daily backups on current plan. Restore test: never performed.
Vendor access: former web developer still listed as a GitHub collaborator.
Privacy: card numbers observed in the CRM notes field. Flag: stop immediately, security professional review.
Incident severity 1: card data exposure. Containment: remove notes, rotate keys, notify using the attorney-reviewed template.
```

Travis reads it against the pass standard. Is critical data backed up, is access reviewable, are secrets controlled, and does the team know how to contain an incident? Not yet. Backups exist but have never been restored. The domain, which is the front door to the whole business, is on his personal email with no second factor. And Dana had been typing card numbers into the notes field for repeat customers because it was faster.

The one revision: the domain moves to the business Google account with MFA and a recovery phone. A monthly restore test into a test project goes on the calendar with Dana's name on it. The former developer is removed from GitHub the same afternoon. The card numbers are deleted from notes, repeat customers are moved to saved payment methods in Stripe, and Travis flags that row for a security professional to review before he calls it closed. That passed.

## Exact working prompt

```text
Create a practical security and recovery plan for [stack]. Cover identity, MFA, roles, secrets, environment separation, logging, backups, restore tests, vendor access, privacy, incident severity, containment, communication, and continuity. Flag items needing a security professional.
```

## Guided practice

1. In the Risk and recovery plan section of the workbook, list every login the business has and mark MFA on or off and shared or not.
2. Run the prompt with your stack in the bracket and read the flagged items first.
3. Fill the risk register with one prevention and one detection per row.
4. Remove one leaver or vendor who no longer needs access, today.
5. Put one restore test or one continuity tabletop on the calendar with a name and a date.

## Assignment and evidence

Complete the risk register and schedule one restore or continuity test.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Critical data is backed up, access is reviewable, secrets are controlled, and the team knows how to contain an incident.

## Common mistakes

- MFA on the important accounts only. Fix: MFA on every account, starting with email and the domain registrar, because those reset everything else.
- Secrets in chat. Fix: keys live in environment variables, and any key that has ever been in a message gets rotated.
- Backups that have never been restored. Fix: a restore test into a test project, on the calendar, quarterly.
- Vendor access that never expires. Fix: list every outside party and remove the ones who are done.
- Handling what needs a professional yourself. Fix: card data, suspected exposure, and regulated fields get flagged and handed off.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Prevent-detect-respond-recover cycle.
**Screen recording:** The Vercel environment variables page with the secrets masked, the Supabase backups page, then a restore into a test project with the customer count compared side by side, ending on the risk register with the flagged rows highlighted.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Risk and recovery plan.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
