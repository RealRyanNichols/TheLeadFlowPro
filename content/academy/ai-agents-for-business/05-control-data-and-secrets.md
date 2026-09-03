# AG L05: Control Data and Secrets

## What you will finish

Keep credentials server-side and minimize personal, confidential, and regulated data. When you are done you will have a data inventory for your workflow and a one-page diagram showing where every key lives and exactly what the model is allowed to see.

## Why this matters

An agent workflow touches two things worth protecting: your customers' information and your keys. Lose the first and you have a trust problem. Lose the second and someone else is running your tools.

Here is the scene. A gym owner in Tyler builds a weekly report agent. To make it work fast, she pastes her Stripe secret key into a ChatGPT project so it can "pull the numbers." A month later she shares that project with a part-time bookkeeper. Now the bookkeeper's laptop has the key that can refund every member. Nobody meant harm. The key just ended up in a place keys should never be.

The second scene is quieter. The follow-up drafter logs every run in full, including the customer's email, address, and the notes column. The log table is readable by everyone with a dashboard login. A year of customer details, sitting in a log nobody thinks of as customer data.

This lesson comes before evaluation and launch because you cannot test your way out of a key in the wrong place. Fix placement first. Then test. You will need the tool loop from lesson four; every tool call on it is a place where a key or a piece of data moves.

## The lesson

The prompt below asks for a threat review across nine areas: personal data, confidential data, credentials, prompt injection paths, browser exposure, logs, retention, access roles, and least-privilege controls. It comes back with a list of fixes. Three moves keep that list short.

### 1. Classify the data

Walk your tool loop and list every field the workflow reads or writes. Then tag each one. I use four tags.

Public: your prices, your service area, your hours. Confidential: your margins, your templates, your vendor pricing. Personal: anything about a specific person, name, phone, email, address, notes. Regulated: anything with a legal rule attached, like health information, payment card numbers, or Social Security numbers.

Now here is the rule. Regulated data does not go into an agent workflow in this course. If a task needs it, the task goes back to lesson one and gets a human-only score. A dental school director does not build an agent on student health forms. She builds one on inquiry forms.

Personal data gets minimized. The model sees what the job needs, not the whole record. The follow-up drafter needs the first name, the estimate date, and the last_contact field. It does not need the email address; the person who sends uses that, after approval. It does not need the notes column. Strip the fields before they reach the model, in the code, not by asking the model to ignore them.

Good looks like a table with three columns: field, tag, does the model see it. The mistake is passing the whole row because it is easier. It is easier for about a week.

### 2. Use least privilege

Every key, login, and role gets the smallest access that still does the job.

Keys live on the server. In this stack that means Vercel environment variables or Supabase edge function secrets, read by code that runs on the server. Never in a browser page, never in a prompt, never in a Notion page, never in a ChatGPT or Claude project file. If you ever paste a key into a chat window, treat that key as burned. Rotate it.

The model itself never holds a key. It asks for a tool, the tool runs on the server with the key, and the model gets back the result. That is why the small named functions from lesson four matter. The function has the key. The model has the function name.

Database access follows the same idea. Supabase gives you a public key for the browser and a service role key that can do anything. The service role key stays on the server and nowhere else. Better still, create a dedicated database role for the workflow that can read the leads table and write only to drafts and agent_runs. If the workflow cannot delete, it cannot delete on its worst day.

Browser exposure is its own line in the review. Any page a person opens in a browser is readable by whoever opens it, including the code behind it. Keys in a page's JavaScript are visible to anyone who opens the developer tools. Your review queue in ClickUp or Notion is fine, because those tools handle the login. Your own dashboard is fine if the keys stay on the server. A homemade admin page that calls Stripe straight from the browser is not.

Access roles are the human side. Who can read the drafts? Who can approve? Who can change the price sheet? Who can pause the workflow? Name them. Fewer is better.

Example. A gym in Tyler needs Stripe totals for a weekly report. The fix: a server function that reads the week's charges with a restricted key that can read but not refund, runs on a schedule, and writes totals, not individual charges, to the reports table. The model sees totals. The owner sees the report. Nobody sees the key.

### 3. Redact logs

Logs are where careful people leak by accident. You spent all lesson keeping personal data away from the model, then the log writes the full prompt and the full response, and there it all is.

The rule: logs record what happened, not the raw content. Lead ID instead of name and email. The last four digits instead of a full number. "Draft created, 96 words, template B" instead of the draft text. If the reviewer needs the text, they open the draft record, which has proper access control. The log does not need to be a second copy.

Prompt injection shows up in logs too. If a customer email contained "ignore your instructions," the log should say "injection pattern detected, escalated," not reprint the email.

Retention is the last piece. Decide how long logs and drafts live. Ninety days for logs is plenty for most small businesses. Drafts that were approved and sent can go once the sent message is recorded on the lead. Write the number down and have the workflow enforce it. Retention rules for customer data can touch privacy law, so have your attorney review the policy once and keep it simple.

Good looks like a log row I could show to a customer without apologizing. The mistake is "log everything so we can debug later." You can debug from IDs and states. You cannot un-leak a log.

Run the review prompt with your loop and your field list. Fix every item marked required before you move to lesson six.

## Worked example

Iron Oak Fitness in Tyler is a fictional example. Owner: Jen. Workflow: the weekly report builder. It reads the members table in Supabase and the week's charges from Stripe, then writes a Monday report.

Jen pastes the tool loop from lesson four and a list of every field it touches into the prompt.

"Perform a data and secret threat review for the Iron Oak weekly report builder. Fields: member name, email, phone, join date, plan, status, notes, weekly charges, refunds. Tools: read members table, read Stripe charges, write reports table. Identify personal data, confidential data, credentials, prompt injection paths, browser exposure, logs, retention, access roles, and least-privilege controls. Return required fixes before launch."

Example output:

```text
Personal data: member name, email, phone, join date. The model needs none of these. Pass counts and totals only.
Confidential: revenue by plan, churn count. Allowed. Restrict report access to Jen and the bookkeeper.
Credentials: Stripe secret key found in a ChatGPT project. Required fix: rotate now, move to a server environment variable, use a restricted read-only key.
Prompt injection paths: member notes field is free text and reaches the model. Required fix: exclude notes from the query.
Browser exposure: report is viewed in Notion, no keys in any page. OK.
Logs: current log stores the full query result. Required fix: log row counts and totals, not rows.
Retention: no rule set. Required fix: logs 90 days, reports kept.
Access roles: Jen (admin), bookkeeper (read reports). Workflow database role: read members, write reports only.
```

Review against the pass standard. Secrets never enter client code or prompts, once the Stripe key is rotated and moved. Logs avoid raw sensitive content, once the fix lands. Two required fixes stand between Jen and a pass, and both are clear.

The one revision: the first diagram put the Stripe call in the same server function as the model call. Jen split them. One function fetches totals with the key. A second function builds the report with the model and never touches Stripe. The key now lives in exactly one place, and the model is not in it.

## Exact working prompt

```text
Perform a data and secret threat review for [workflow]. Identify personal data, confidential data, credentials, prompt injection paths, browser exposure, logs, retention, access roles, and least-privilege controls. Return required fixes before launch.
```

## Guided practice

1. List every field your tool loop reads or writes and tag each one public, confidential, personal, or regulated.
2. For each personal field, write yes or no: does the model need to see it?
3. Find every key your workflow uses and write down where it lives today; if any key lives in a chat, a page, or a browser, rotate it now.
4. Run the prompt with your loop and field list, and mark each fix required or optional in the Data threat review section of the workbook.
5. Draw one page: a server box holding the keys, a model box holding only the fields it sees, and a log box holding only IDs and states.

## Assignment and evidence

Create the data inventory and secret placement diagram.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Secrets never enter client code or prompts, and logs avoid raw sensitive content.

## Common mistakes

- Pasting a key into a chat or a project file to test faster. Fix: rotate it, put it in a server environment variable, and call it through a function.
- Using the Supabase service role key for the workflow. Fix: a dedicated role with read on what it needs and write on drafts and logs only.
- Sending the whole customer row to the model. Fix: select the three fields the job needs, in code.
- Logging full prompts and responses. Fix: IDs, counts, states, and template names.
- Building an agent on regulated data because the task repeats. Fix: human-only, back to lesson one.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Secret and data trust boundaries.
**Screen recording:** Open the Vercel environment variables page and the Supabase table editor side by side, show the restricted role's permissions, then show a redacted agent_runs row next to a bad one.
**Course map:** the course visual below anchors where this lesson sits.

![AI Agents for Business course visual](/images/academy/ai-agents-for-business.svg)

## Downloadable

[Open the AI Agents for Business workbook](/downloads/operator-academy/ai-agents-for-business-workbook.pdf)

Workbook section: OA07 Agent Workbook, Data threat review.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
