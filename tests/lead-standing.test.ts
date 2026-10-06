import assert from "node:assert/strict";
import test from "node:test";
import { leadStanding } from "../lib/leadStanding";
test("latest curated standing takes precedence over old form and note history", () => {
 const note = "Old personal material\n[LEADFLOW STANDING]\nSummary: Earlier voicemail.\nNext: Try calling.\nUpdated: 2026-10-03T12:00:00Z\n[/LEADFLOW STANDING]\n[LEADFLOW STANDING]\nSummary: Reviewed proposal; funding decision pending.\nNext: Follow up tomorrow; time not agreed.\nUpdated: 2026-10-06T19:40:00Z\n[/LEADFLOW STANDING]";
 const result=leadStanding({notes:note,status:"proposal"});
 assert.equal(result.summary,"Reviewed proposal; funding decision pending.");
 assert.equal(result.nextAction,"Follow up tomorrow; time not agreed.");
});
test("arbitrary historical notes and private references never become contact-list copy", () => {
 const result=leadStanding({notes:"private token/customer discussion /root/private email@example.com",status:"contacted"});
 assert.equal(result.summary,"Contacted. Check the latest reply and next action.");assert.equal(result.nextAction,null);
 const curated=leadStanding({notes:"[LEADFLOW STANDING]\nSummary: Contacted https://secret.invalid/x person@example.com\nNext: Read /root/private/note\nUpdated: invalid\n[/LEADFLOW STANDING]"});
 assert.doesNotMatch(curated.summary,/https|@/);assert.equal(curated.updatedAt,null);
});
test("a manually changed stage supersedes an older curated decision summary", () => {
 const result=leadStanding({status:"won",notes:"[LEADFLOW STANDING]\nStatus: proposal\nSummary: Awaiting a decision.\nNext: Ask for the decision.\nUpdated: 2026-10-06T12:00:00Z\n[/LEADFLOW STANDING]"});
 assert.match(result.summary,/Won/);assert.equal(result.nextAction,null);
});
