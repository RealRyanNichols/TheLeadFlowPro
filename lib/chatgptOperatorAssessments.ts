type Question = {
  question: string;
  options: readonly string[];
  answer_index: number;
  explanation: string;
};

const q = (
  question: string,
  options: readonly string[],
  answer_index: number,
  explanation: string,
): Question => ({ question, options, answer_index, explanation });

export const CHATGPT_OPERATOR_ASSESSMENTS = {
  passing_score_percent: 80,
  lesson_checks: {
    "CG L01": [
      q("When is a ChatGPT project more useful than a standalone chat?", ["When several chats need the same files and instructions", "Only when writing code", "Whenever the answer must be short"], 0, "Projects keep related chats, files, instructions, and sources together."),
      q("What belongs in project instructions?", ["Every private password", "Stable context and rules that should apply across the project", "A different outcome for every future chat"], 1, "Project instructions should contain durable context and working rules, not secrets or unrelated one-off requests."),
    ],
    "CG L02": [
      q("Which four prompt parts are taught in this course?", ["Goal, context, output, boundaries", "Code, color, cost, calendar", "Question, answer, citation, emoji"], 0, "Goal, context, output, and boundaries provide enough direction without forcing unnecessary steps."),
      q("What should you do when a missing fact would materially change the result?", ["Let ChatGPT invent it", "Flag it or ask for it", "Hide the uncertainty"], 1, "Important missing information should be requested or clearly flagged instead of guessed."),
    ],
    "CG L03": [
      q("What makes a content kit useful?", ["Every asset points toward the same audience and goal", "It uses the most hashtags possible", "It never needs review"], 0, "A coordinated kit is built around one audience, offer, and next action."),
      q("What must happen before publishing AI-assisted copy?", ["A human review for truth, tone, and fit", "Nothing", "Remove every specific detail"], 0, "The operator remains responsible for reviewing what is published."),
    ],
    "CG L04": [
      q("What makes an image prompt easier to control?", ["Concrete subject, composition, style, and constraints", "Only saying make it better", "Asking for ten unrelated styles"], 0, "Concrete visual direction gives the image system useful decisions and boundaries."),
      q("When editing an existing image, what should the prompt name?", ["Only what should change", "What should change and what must remain fixed", "No details at all"], 1, "Preservation instructions reduce unwanted drift during an edit."),
    ],
    "CG L05": [
      q("How do you keep a social post sounding human?", ["Provide real voice examples and edit the result", "Add corporate filler", "Remove every story"], 0, "Real examples plus human review give ChatGPT usable voice context."),
      q("What should an email prompt clarify?", ["Audience, purpose, action, and tone", "Only the subject line", "The sender's password"], 0, "Those details determine what the email must accomplish and how it should sound."),
    ],
    "CG L06": [
      q("What is the primary job of a landing page?", ["Move one audience toward one next action", "Contain every fact about the company", "Win a design award"], 0, "A focused landing page serves a specific visitor and conversion action."),
      q("Which item belongs in the pre-launch review?", ["Mobile layout, labels, claims, and calls to action", "Only the desktop background", "Only the word count"], 0, "A usable page needs responsive, accessible, honest, and functional review."),
    ],
    "CG L07": [
      q("When should ChatGPT search the web?", ["When the answer depends on current information", "Never", "Only for jokes"], 0, "Current or unstable facts should be verified with recent sources."),
      q("What is the difference between a sourced fact and an inference?", ["An inference is a conclusion drawn from facts and must be labeled", "There is no difference", "Facts never need sources"], 0, "A professional brief separates what a source states from what the operator concludes."),
    ],
    "CG L08": [
      q("What should you provide when asking ChatGPT to turn files into a deliverable?", ["The audience, format, source role, and review criteria", "Every file you own", "No outcome"], 0, "Relevant inputs and a clear delivery standard keep the work focused."),
      q("What should happen when two source files conflict?", ["ChatGPT should flag the conflict", "Choose whichever is convenient", "Delete both facts"], 0, "Conflicting source material should be surfaced for review, not silently resolved."),
    ],
    "CG L09": [
      q("What is the first purpose of a quality-control loop?", ["Find the highest-impact problems before delivery", "Make the document longer", "Hide uncertainty"], 0, "Quality control should catch material errors, omissions, weak structure, and unusable output."),
      q("How should a revision prompt protect approved work?", ["Name what must remain unchanged", "Start over every time", "Remove all boundaries"], 0, "Preservation requirements keep a focused fix from introducing new drift."),
    ],
    "CG L10": [
      q("What turns a prompt into a repeatable workflow?", ["Defined inputs, steps, outputs, review gates, and owner", "More adjectives", "A hidden password"], 0, "A workflow can be repeated because its inputs, process, decision points, and result are explicit."),
      q("Where should a human approval gate be placed?", ["Before consequential external actions", "After everything is already published", "Nowhere"], 0, "Sending, publishing, spending, deleting, or changing relied-upon data should remain reviewable."),
    ],
    "CG L11": [
      q("Which information should not be pasted into a normal prompt?", ["Passwords, private keys, and unnecessary sensitive records", "The desired output format", "Public business hours"], 0, "Use the minimum necessary data and keep credentials out of prompts."),
      q("Who remains responsible for a result created with ChatGPT?", ["The human or organization using it", "Nobody", "The viewer"], 0, "AI assistance does not remove the operator's responsibility to review and use the result appropriately."),
    ],
    "CG L12": [
      q("What must the capstone demonstrate?", ["A complete path from input to reviewed business outcome", "Only a long prompt", "Only a logo"], 0, "The capstone proves the learner can operate the whole system, not merely produce one isolated output."),
      q("When is the capstone ready to submit?", ["When the result works, the evidence is attached, and the limits are explained", "Before it is tested", "After deleting the process"], 0, "A professional submission includes the finished work, proof of review, and honest limitations."),
    ],
  },
  final_assessment: [
    { source_lesson: "CG L01", question_index: 0 },
    { source_lesson: "CG L02", question_index: 0 },
    { source_lesson: "CG L03", question_index: 1 },
    { source_lesson: "CG L04", question_index: 1 },
    { source_lesson: "CG L05", question_index: 0 },
    { source_lesson: "CG L06", question_index: 0 },
    { source_lesson: "CG L07", question_index: 1 },
    { source_lesson: "CG L08", question_index: 1 },
    { source_lesson: "CG L09", question_index: 1 },
    { source_lesson: "CG L10", question_index: 1 },
    { source_lesson: "CG L11", question_index: 0 },
    { source_lesson: "CG L12", question_index: 0 },
  ],
} as const;
