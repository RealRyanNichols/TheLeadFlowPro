import { test } from "node:test";
import assert from "node:assert/strict";
import { contactPage } from "../lib/contactPagination";
test("pages cover every contact once, with at most fifteen cards", () => {
 const rows = Array.from({length:32},(_,i)=>i);
 assert.deepEqual([1,2,3].flatMap(n=>contactPage(rows,n).rows),rows);
 assert.deepEqual([1,2,3].map(n=>contactPage(rows,n).rows.length),[15,15,2]);
 assert.deepEqual([contactPage(rows,2).first,contactPage(rows,2).last],[16,30]);
});
test("shrinking data and invalid or empty pages stay navigable", () => {
 assert.equal(contactPage(Array.from({length:16}),9).page,2);
 assert.equal(contactPage(Array.from({length:14}),2).page,1);
 const empty=contactPage([],0);assert.equal(empty.page,1);assert.equal(empty.first,0);assert.equal(empty.last,0);assert.deepEqual(empty.rows,[]);
});
