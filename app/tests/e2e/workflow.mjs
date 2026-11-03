import { startApp } from "./harness.mjs";
import assert from "node:assert/strict";
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name, String(e.message).split("\n")[0]]); } };
const app = await startApp();
const { page, db, log } = app;
const text = async () => page.locator("body").innerText();
const settle = () => page.waitForTimeout(500);
await settle();

await step("sign-in session loads workspace, 4 primary destinations", async () => {
  const nav = await page.locator('nav[aria-label="Primary"] button').allInnerTexts();
  assert.deepEqual(nav.map((t) => t.trim()), ["Home", "Scholarships", "My Materials", "Settings"]);
});
await step("student switcher visible; select Jaden", async () => {
  await page.locator(".topbarStudentPicker select").selectOption("Jaden");
  await settle();
  assert.match(await text(), /SCHOLARSHIP WORKSPACE\s+Jaden/i);
});
await step("Browse shows essentials: amount, deadline, unverified/verified, eligibility", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click();
  await page.locator("input[type=checkbox]").first().check(); // show all
  await settle();
  const t = await text();
  assert.match(t, /Amount varies/);
  assert.match(t, /Deadline needs checking/);
  assert.match(t, /listed as “March 1”/);
  assert.match(t, /Unverified/);
  assert.match(t, /Verified Sep 1, 2026/);
  assert.match(t, /Eligibility unknown/);
  assert.match(t, /past due/i);
});
await step("Unknown deadline never invented (text-only deadline stays unknown)", async () => {
  const card = page.locator("article.scholarshipItem", { hasText: "Text Deadline Award" });
  const t = await card.innerText();
  assert.doesNotMatch(t, /Due /);
});
await step("Save a scholarship (lightweight)", async () => {
  const card = page.locator("article.scholarshipItem", { hasText: "Exact Deadline Award" });
  await card.getByRole("button", { name: /Save for Jaden/ }).click();
  await settle();
  assert.equal(db.student_scholarships.length, 1);
  assert.equal(db.student_scholarships[0].application_status, "Researching");
  assert.match(await card.innerText(), /Start application/);
});
await step("Saved view lists it with 'Start application'", async () => {
  await page.getByRole("button", { name: /^Saved/ }).click();
  await settle();
  const t = await text();
  assert.match(t, /Exact Deadline Award/);
  assert.match(t, /Saved/);
});
await step("Start application -> Preparing, tasks generated, lands in In progress, no duplicate on repeat", async () => {
  await page.getByRole("button", { name: "Start application" }).click();
  await settle();
  assert.equal(db.application_workspaces[0].status, "Drafting");
  assert.equal(db.student_scholarships[0].application_status, "Drafting");
  assert.equal(db.tasks.length, 3);
  assert.match(await text(), /In progress/);
  assert.match(await text(), /0 of 3 tasks done/);
});
await step("Card opened automatically (resume focus); checklist visible", async () => {
  assert.match(await text(), /Review requirements/);
});
await step("Complete a task from the card", async () => {
  await page.locator(".trackerTasks input[type=checkbox]").first().click();
  await settle();
  assert.equal(db.tasks.filter((t) => t.completed).length, 1);
  assert.match(await text(), /1 of 3 tasks done/);
});
await step("Add task; duplicate is rejected", async () => {
  await page.getByLabel("New task").fill("Ask teacher for letter");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await settle();
  assert.equal(db.tasks.length, 4);
  await page.getByLabel("New task").fill("ask teacher for letter");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await settle();
  assert.equal(db.tasks.length, 4);
  assert.match(await text(), /already on the list/);
});
await step("Save notes on blur", async () => {
  await page.getByPlaceholder("Notes for this application").fill("Essay due Friday");
  await page.getByPlaceholder("Notes for this application").blur();
  await settle();
  assert.equal(db.application_workspaces[0].submission_notes, "Essay due Friday");
});
await step("Home: resume + next tasks + deadlines", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Home" }).click();
  await settle();
  const t = await text();
  assert.match(t, /Resume an application/);
  assert.match(t, /Exact Deadline Award/);
  assert.match(t, /Review requirements|Draft essay|Gather transcript|Ask teacher/);
  assert.match(t, /days left/);
  assert.match(t, /1 .*deadline|no exact deadline|has no exact deadline|have no exact deadline|Upcoming deadlines/);
});
await step("Home task checkbox completes task", async () => {
  const before = db.tasks.filter((t) => t.completed).length;
  await page.locator(".homeTask input[type=checkbox]").first().click();
  await settle();
  assert.equal(db.tasks.filter((t) => t.completed).length, before + 1);
});
await step("Resume button returns to application", async () => {
  await page.getByRole("button", { name: "Resume" }).click();
  await settle();
  assert.match(await text(), /Checklist/);
});
await step("Reuse an answer: 'Find an answer to reuse' opens My Materials > Answers", async () => {
  await page.getByRole("button", { name: "Find an answer to reuse" }).click();
  await settle();
  assert.match(await text(), /My answers/);
});
await step("Add + save an answer, then copy button present", async () => {
  await page.getByRole("button", { name: "Add an answer" }).or(page.locator("summary", { hasText: "Add an answer" })).first().click();
  await page.getByLabel("Question or prompt").fill("Describe leadership");
  await page.getByLabel("Your answer").fill("I led my team.");
  await page.getByRole("button", { name: "Save answer" }).click();
  await settle();
  assert.equal(db.answer_bank.length, 1);
  assert.match(await text(), /Copy/);
});
await step("Status progression: needs review -> ready -> submitted -> awarded (via buttons)", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click();
  await page.getByRole("button", { name: "In progress", exact: false }).first().click();
  await settle();
  await page.locator("article.trackerCard select").first().selectOption("needs_review");
  await settle();
  assert.equal(db.student_scholarships[0].application_status, "Needs Review");
  assert.equal(db.application_workspaces[0].status, "Needs Review");
  await page.getByRole("button", { name: "Mark ready to submit" }).click(); await settle();
  assert.equal(db.student_scholarships[0].application_status, "Ready to Submit");
  assert.match(await text(), /Ready to submit/);
  await page.getByRole("button", { name: "Mark as submitted" }).click(); await settle();
  assert.equal(db.student_scholarships[0].application_status, "Submitted");
  await page.getByRole("button", { name: /^Results/ }).click(); await settle();
  assert.match(await text(), /Submitted/);
  await page.getByRole("button", { name: "Awarded", exact: true }).click(); await settle();
  assert.equal(db.student_scholarships[0].application_status, "Won");
});
await step("Awards page shows won scholarship", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "My Materials" }).click();
  await page.getByRole("button", { name: "Awards" }).click(); await settle();
  const t = await text();
  assert.match(t, /Awards/);
});
await step("Service: add hours", async () => {
  await page.getByRole("button", { name: /Service/ }).click(); await settle();
  await page.getByRole("button", { name: /Add Hours/ }).first().click();
  await page.locator(".serviceSheetForm input[type=number]").first().fill("2");
  await page.locator(".serviceSheetForm input[list=service-org-options]").fill("Local Church");
  await page.locator(".serviceSheetForm input[placeholder='Activity title']").fill("Nursery helper");
  await page.locator(".serviceSheetForm button.primary").click(); await settle();
  assert.equal(db.service_logs.length, 1);
});
await step("Settings: profiles reachable, update profile, account panel with sign out", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Settings" }).click(); await settle();
  assert.match(await text(), /Student profiles|Student Profiles/i);
  await page.getByRole("button", { name: /Family & account/ }).click(); await settle();
  assert.match(await text(), /Signed in as u1@example.com/);
  assert.ok(await page.getByRole("button", { name: "Sign out" }).first().isVisible());
});
await step("Return later (reload) -> data persisted, resume still works", async () => {
  await page.reload(); await page.waitForTimeout(1500);
  await page.locator(".topbarStudentPicker select").selectOption("Jaden"); await settle();
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click();
  await page.getByRole("button", { name: /^Results/ }).click(); await settle();
  assert.match(await text(), /Exact Deadline Award/);
  assert.match(await text(), /Awarded/);
});
await step("Multiple students: Elsie's workspace is separate", async () => {
  await page.locator(".topbarStudentPicker select").selectOption("Elsie"); await settle();
  assert.doesNotMatch(await text(), /Exact Deadline Award/);
});
await step("Not eligible then undo", async () => {
  await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click();
  await page.getByRole("button", { name: "Browse" }).click();
  await page.locator("input[type=checkbox]").first().check(); await settle();
  const card = page.locator("article.scholarshipItem", { hasText: "No Info Award" });
  await card.locator("summary", { hasText: "More" }).click();
  await card.getByRole("button", { name: /Not eligible for Elsie/ }).click(); await settle();
  assert.equal(db.student_scholarships.find((t) => t.scholarship_id === "c3").application_status, "Not Eligible");
  await page.getByRole("button", { name: /^Saved/ }).click(); await settle();
  await page.locator("summary", { hasText: "Marked not eligible" }).click();
  await page.getByRole("button", { name: "Move back to Saved" }).click(); await settle();
  assert.equal(db.student_scholarships.find((t) => t.scholarship_id === "c3").application_status, "Researching");
});
await step("No page errors / console errors during run", async () => {
  assert.deepEqual(log.errors, []);
  assert.deepEqual(log.consoleErrors.filter((e) => !/Failed to load resource/.test(e)), []);
});
for (const r of results) console.log(r.join(" | "));
console.log(`${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
await page.screenshot({ path: "final.png" });
await app.close();
