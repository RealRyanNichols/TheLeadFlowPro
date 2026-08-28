import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAGNOSTIC_EMAIL_STEPS,
  diagnosticServerResumeToken,
  diagnosticStepsDueBy,
  verifyDiagnosticServerResumeToken,
} from "../lib/businessDiagnosticEmails";

test("the diagnostic campaign owns seven non-overlapping daily steps", () => {
  assert.deepEqual(
    DIAGNOSTIC_EMAIL_STEPS.map(({ step, day }) => ({ step, day })),
    [
      { step: 200, day: 0 },
      { step: 201, day: 1 },
      { step: 202, day: 2 },
      { step: 203, day: 3 },
      { step: 204, day: 4 },
      { step: 205, day: 5 },
      { step: 206, day: 6 },
    ],
  );
  assert.deepEqual(
    diagnosticStepsDueBy(2).map((step) => step.step),
    [200, 201, 202],
  );
});

test("the first education days follow Facebook, YouTube, then repeatable posting", () => {
  assert.match(DIAGNOSTIC_EMAIL_STEPS[1].subject, /Facebook/i);
  assert.match(DIAGNOSTIC_EMAIL_STEPS[2].subject, /YouTube/i);
  const dayThree = DIAGNOSTIC_EMAIL_STEPS[3].body({
    firstName: "Jeff",
    answers: {},
    resumeUrl: "https://example.com/resume",
    bookUrl: "https://example.com/book",
  });
  assert.match(dayThree, /Teach:/);
  assert.match(dayThree, /Prove:/);
  assert.match(dayThree, /Invite:/);
  assert.match(dayThree, /TikTok can be an optional place/i);
  assert.match(dayThree, /does not guarantee reach, leads, or sales/i);
});

test("cron resume tokens are signed, tamper-evident, and resolve to one request", () => {
  const previous = process.env.DIAGNOSTIC_RESUME_SECRET;
  process.env.DIAGNOSTIC_RESUME_SECRET = "diagnostic-test-secret-at-least-32-characters";
  try {
    const requestId = "123e4567-e89b-42d3-a456-426614174000";
    const token = diagnosticServerResumeToken(requestId);
    assert.ok(token);
    assert.equal(verifyDiagnosticServerResumeToken(token), requestId);

    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    assert.equal(verifyDiagnosticServerResumeToken(tampered), null);
  } finally {
    if (previous === undefined) delete process.env.DIAGNOSTIC_RESUME_SECRET;
    else process.env.DIAGNOSTIC_RESUME_SECRET = previous;
  }
});
