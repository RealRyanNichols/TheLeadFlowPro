import { test } from "node:test";
import assert from "node:assert/strict";
import { compareOpportunities } from "../lib/opportunityOrder";
import { latestTouches } from "../lib/leadTouch";
test("active heat before closed; stage and follow-up break ties", () => {
 const row = (id: string, status: string, priority: string, date?: string) => ({id,status,priority,created_at:"2026-10-06T10:00:00Z",next_follow_up_at:date});
 const rows = [row("won","won","hot"),row("normal","new","normal"),row("new-hot","new","hot"),row("proposal","proposal","hot"),row("due","proposal","hot","2026-10-07T00:00:00Z"),row("lost","lost","hot")];
 assert.deepEqual(rows.sort(compareOpportunities).map(r=>r.id),["due","proposal","new-hot","normal","won","lost"]);
});
test("latest person excludes bots, inbound contacts and untrusted activity prefixes", () => {
 const r = latestTouches([
 {lead_id:"a",created_at:"2026-10-06T12:00:00Z",author:"Patrick Grabbs"},
 {lead_id:"a",created_at:"2026-10-06T13:00:00Z",kind:"sales",detail:"Ryan Nichols: Stage changed to proposal"},
 {lead_id:"a",created_at:"2026-10-06T14:00:00Z",author:"Codex for Patrick"},
 {lead_id:"a",created_at:"2026-10-06T15:00:00Z",author:"Customer",direction:"inbound"},
 {lead_id:"b",created_at:"2026-10-06T12:00:00Z",kind:"system",detail:"Patrick: Sent email"},
 {lead_id:"c",created_at:"invalid",author:"Ryan Nichols"}]);
 assert.equal(r.a.name,"Ryan Nichols"); assert.equal(r.a.at,"2026-10-06T13:00:00Z"); assert.equal(r.b,undefined); assert.equal(r.c,undefined);
});
