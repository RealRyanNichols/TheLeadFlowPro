# CG L08: Turn Files and Notes Into Client Ready Work

## What you will finish

Transform supplied files and notes into a structured deliverable without losing facts, decisions, ownership, or unresolved questions. When you are done you will have one document, built from at least two real source files, that a client or a board could read and act on, with five statements checked against the originals.

## Why this matters

Every business has this pile. Meeting notes in a phone. A spreadsheet somebody built two years ago. An email thread with the real decision buried in reply number nine. A PDF from a vendor. The information is there. Nobody can use it, because it is in six places and nobody has time to pull it together.

A youth baseball league in Longview was about to vote on field lights. The board president had notes from three meetings, a budget spreadsheet, and a quote thread. Every board member had a different memory of what had been decided. The vote got delayed a month because nobody could say what the facts were.

ChatGPT can read files. Upload a PDF, a spreadsheet, a Word document, or a text file, and it can pull the facts out and arrange them. The risk is that it smooths over the gaps. It fills a missing date with a plausible one. It turns "we might" into "we will." A client-ready document cannot do that.

This lesson is how to get the structure without losing the truth. It follows the research lesson because the discipline is the same: every statement points at a source. Next lesson you learn to audit the result.

## The lesson

### 1. Inventory the source set

Before you ask for anything, list what you have. Open a new chat in your project, named for the deliverable. Upload every file with the plus button in the message box, or add them to the project files if you will use them again. PDFs, spreadsheets, Word files, and plain text all work. For notes in your phone, paste them as text.

Then ask for an inventory before the document. The exact working prompt already starts this way: list the sources and any conflicts first. For each file you want the name, what it is, its date, who made it, what it is good for, and what it contradicts in another file.

Read the inventory. This is where you catch the spreadsheet that is a year old, the notes that are missing a page, and the two files that give different numbers for the same thing. Decide now which source wins each conflict and tell ChatGPT: "Use the registration spreadsheet for player counts. The notes are from memory."

What good looks like: a short list, one line per file, with dates, and every conflict named before a single sentence of the deliverable is written.

The mistake is skipping the inventory and going straight to "write the report." Then the report is confident and half of it came from the wrong file.

Example: a roofer in Gilmer uploads inspection notes, a photo log, and a manufacturer spec sheet. The inventory shows the notes say 8,400 square feet and the photo log caption says 8,900. He has to pick before the proposal exists.

### 2. Define the deliverable schema

A schema is the fixed set of sections. The prompt gives you one that works for a brief, a proposal, an SOP, or a report: executive summary, verified facts, decisions, action items with owners and dates, risks, open questions, and a source appendix.

Name the reader and the decision in the prompt. "For the league board, to vote on whether to fund field lights this season." The reader decides the length and the tone. A board wants a page. A client wants the price and the schedule up front. A crew wants steps.

Here is what each section is for. Executive summary: the decision and the recommendation in five lines. Verified facts: only what a source states, each with its source in parentheses. Decisions: what has actually been decided, by whom, when. Action items: a task, a person's name, a date, nothing without all three. Risks: what could go wrong and what you would do. Open questions: what the sources do not answer. Source appendix: the inventory from step one.

The line that protects you is the last one in the prompt: do not fill gaps with assumptions. If a date is missing, the document says "date not in sources." If the owner is not named, it says "owner not assigned." Those lines look like weakness. They are the most useful lines in the document, because they are the questions the reader has to answer.

What good looks like: the reader can find the decision in the first five lines, the facts behind it in the next section, and who does what by when after that.

The mistake is letting ChatGPT write a nice narrative instead of the schema. Narrative hides gaps. Sections expose them.

Example: a consultant in Tyler uses the same schema for every client kickoff summary. Clients start expecting it. That is what a standard looks like.

### 3. Trace decisions back to evidence

Now read the deliverable against the files. Not the whole thing at once. Take the decisions and the action items, because those are what people act on, and trace each one back.

For every decision, find the source line. "Board voted 5 to 2 to get three quotes" should point at the meeting notes and the date. If it points nowhere, it is not a decision, it is a guess, and it moves to open questions.

For every action item, check the owner and the date against the source. If the notes say "Carla will get quotes" and the document says "Carla will get quotes by September 30," where did September 30 come from? If it is not in a file, it is invented. Replace it with "date not set" and flag it.

Then the assignment: pick five statements from the document, including at least one number, and verify each against the original file. Open the spreadsheet. Find the cell. Open the notes. Find the line. Write down which five, where you found them, and whether they held.

If a statement fails, tell ChatGPT exactly what to change: "The player count is 388 per the registration spreadsheet, not 412. Correct it everywhere it appears and add the source." Then check that it changed everywhere.

What good looks like: every decision and action in the document has a source you could show the reader on request.

The mistake is verifying the summary and trusting the details. The summary is written last and sounds right. The details are where the numbers live.

Example: the league president traces four action items. Three hold. One has a date that appears in no file. She flags it, and at the next meeting the board sets the real date.

## Worked example

East Texas Youth Baseball League in Longview is a fictional example. Carla is the board president. She has three files: typed notes from the July and August board meetings, the 2026 budget spreadsheet, and a saved email thread with two quotes for field lights. The deliverable is a board brief for the September vote.

She opens a chat named "Field lights board brief," uploads the three files, and runs the exact working prompt with "board brief" and "the league board, to vote on funding field lights this season" filled in.

Example output:

```text
Sources: (1) Board notes, July 14 and Aug 11, typed by C. Reyes. (2) 2026 budget spreadsheet, last edited Aug 3. (3) Email thread, two lighting quotes, Aug 19 to Aug 27. Conflict: notes cite 412 players; spreadsheet registration tab shows 388.
Executive summary: The board is deciding whether to fund field lights for the spring season. Two quotes are in hand. Current reserves cover the lower quote with the margin noted below.
Decisions: Aug 11, board voted to obtain quotes (notes, item 4). No funding decision has been made.
Action items: C. Reyes to confirm quote validity dates. Owner named in thread. Date not in sources.
Open questions: Whether the higher quote includes installation. The thread does not say.
```

Carla verifies five statements. The August vote line matches the notes. The reserve number matches the budget tab. The lower quote matches the email. The player count in the summary said 412, from the notes, but she had told it the spreadsheet wins, so that fails. And "installation included" had appeared in the risks section as a fact, when the thread never says it.

Review against the pass standard. Usable by its reader: one page, decision up front. Preserves source truth: after two fixes. Labels gaps: yes, two "not in sources" lines. Converts decisions into owned actions: yes, with one date flagged as unset.

The one revision: "Correct the player count to 388 per the registration spreadsheet everywhere it appears. Move the installation statement from risks to open questions, since no source confirms it." Clean on the reread. She saves the three files, the prompt, both versions, and her five-line verification list.

## Exact working prompt

```text
Use only the attached files and notes to create a [brief, proposal, SOP, or report] for [reader and decision]. First list the sources and any conflicts. Then produce the deliverable with executive summary, verified facts, decisions, action items with owners and dates, risks, open questions, and a source appendix. Do not fill gaps with assumptions.
```

## Guided practice

1. Pick one real decision or client need and gather at least two source files for it.
2. Open a chat in your project named for the deliverable and upload the files.
3. Run the exact working prompt, read the source inventory, and tell ChatGPT which file wins each conflict.
4. Trace every decision and action item back to a line in a file, and move anything unsupported to open questions.
5. Verify five statements against the originals, fix what fails, and fill in the file-to-deliverable map from the workbook.

## Assignment and evidence

Create one client-ready document from at least two source files and verify five statements against the originals.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

The deliverable is usable by its reader, preserves source truth, labels gaps, and converts decisions into owned actions.

## Common mistakes

- Skipping the source inventory. Fix: list every file with its date and conflicts before writing.
- Letting a plausible date or owner fill a gap. Fix: "not in sources" is the correct answer.
- Asking for a narrative instead of the schema. Fix: keep the seven sections, every time.
- Verifying the summary and trusting the numbers. Fix: open the spreadsheet and find the cell.
- Fixing a fact in one place. Fix: tell it to correct everywhere it appears, then check.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Files and notes to structured client output.
**Screen recording:** Upload three files in a project chat, run the prompt, show the source inventory and the conflict, scroll the sectioned deliverable, open the spreadsheet beside it to verify the player count, and run the correction.
**Course map:** the course visual below anchors where this lesson sits.

![The ChatGPT Operator course visual](/images/academy/chatgpt-operator.svg)

## Downloadable

[Open the ChatGPT Operator workbook](/downloads/operator-academy/chatgpt-operator-workbook.pdf)

Workbook section: OA01 ChatGPT Operator Workbook, File-to-deliverable map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.
