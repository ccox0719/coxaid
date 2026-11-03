import assert from "node:assert/strict";
import { STAGES, stageOf, deadlineInfo, verificationInfo, eligibilityInfo, amountLabel, nextActionFor } from "../src/lib/applicationStatus.js";

// Every enum value in supabase/schema.sql maps to exactly one stage.
for (const status of ["Not Started", "Researching", "Drafting", "Needs Review", "Ready to Submit", "Submitted", "Won", "Lost", "Not Eligible"]) {
  assert.equal(STAGES.filter((s) => s.statuses.includes(status)).length, 1, status);
}
assert.equal(stageOf("Researching").key, "saved");
assert.equal(stageOf("Drafting").key, "preparing");
assert.equal(stageOf("Offered").key, "awarded");
assert.equal(stageOf("Ready to Submit").key, "ready");
assert.notEqual(stageOf("Ready to Submit").key, stageOf("Submitted").key);
assert.notEqual(stageOf("Submitted").key, stageOf("Won").key);
assert.equal(stageOf("Not Eligible").key, "not_eligible");
// every stage's write value maps back to itself
for (const s of STAGES) assert.equal(stageOf(s.write).key, s.key);

const today = new Date(2026, 10, 3);
assert.equal(deadlineInfo({ deadline: "2026-11-10" }, null, today).days, 7);
assert.equal(deadlineInfo({ deadline: "2026-11-01" }, null, today).pastDue, true);
const unknown = deadlineInfo({ deadline: null, deadline_raw: "March 1" }, null, today);
assert.equal(unknown.known, false);
assert.equal(unknown.label, "Deadline needs checking");
assert.equal(unknown.raw, "March 1");
assert.equal(deadlineInfo({ deadline: "2026-11-10" }, { deadline: "2026-11-05" }, today).days, 2);

assert.equal(verificationInfo({}).verified, false);
assert.equal(verificationInfo({ last_verified_at: "2026-09-01" }).verified, true);
// Unverified never reads as confirmed; unknown eligibility is not "not eligible".
assert.equal(eligibilityInfo({}, null).key, "unknown");
assert.equal(eligibilityInfo({ eligible_now: true }, { application_status: "Not Eligible" }).key, "not_eligible");
assert.equal(amountLabel({ award: "" }), "Amount varies");
assert.equal(nextActionFor("preparing", { openTaskCount: 2 }), "Finish 2 open tasks");
console.log("applicationStatus tests passed");
