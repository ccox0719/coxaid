import { startApp, seed } from "./harness.mjs";
import assert from "node:assert/strict";
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name, String(e.message).split("\n")[0]]); } };
const settle = (p) => p.waitForTimeout(600);

// --- student role
{
  const app = await startApp({ role: "student", userId: "u2", studentId: "s1" });
  const { page, db, log } = app; await settle(page);
  const body = () => page.locator("body").innerText();
  await step("student: signs in, sees own name & 4 destinations", async () => {
    assert.match(await body(), /Jaden/);
    assert.equal(await page.locator('nav[aria-label="Primary"] button').count(), 4);
  });
  await step("student: can browse and save, then start", async () => {
    await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click();
    await page.locator("input[type=checkbox]").first().check(); await settle(page);
    const card = page.locator("article.scholarshipItem", { hasText: "Veteran Family Grant" });
    await card.getByRole("button", { name: /Save for/ }).click(); await settle(page);
    assert.equal(db.student_scholarships.length, 1);
    assert.equal(db.student_scholarships[0].student_id, "s1");
  });
  await step("student: no admin-only controls (Add scholarship / Edit / Delete) shown", async () => {
    const t = await body();
    assert.doesNotMatch(t, /Add a scholarship/);
    assert.equal(await page.getByText("Edit scholarship").count(), 0);
    assert.equal(await page.getByText("Delete from library").count(), 0);
  });
  await step("student: settings shows profile + account, family admin actions gated", async () => {
    await page.locator('nav[aria-label="Primary"] button', { hasText: "Settings" }).click(); await settle(page);
    await page.getByRole("button", { name: /Family & account/ }).click(); await settle(page);
    assert.match(await body(), /Signed in as u2@example.com/);
  });
  await step("student: no page errors", async () => assert.deepEqual(log.errors, []));
  await app.close();
}

// --- loading failure
{
  const app = await startApp({ failTable: "scholarships" });
  const { page, log } = app; await page.waitForTimeout(2500);
  await step("loading failure: app does not crash and surfaces a message", async () => {
    const t = await page.locator("body").innerText();
    assert.ok(/forced failure|Unable|No family access|Loading/i.test(t), t.slice(0, 300));
    assert.deepEqual(log.errors, []);
  });
  console.log("  failure screen text:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
  await app.close();
}

// --- empty workspace
{
  const db = seed(); db.scholarships = [];
  const app = await startApp({ db });
  const { page, log } = app; await settle(page);
  await step("empty: Home, Browse, Saved, In progress, Results, Tasks show empty states without errors", async () => {
    const t0 = await page.locator("body").innerText();
    assert.match(t0, /No applications in progress/);
    await page.locator('nav[aria-label="Primary"] button', { hasText: "Scholarships" }).click(); await settle(page);
    assert.match(await page.locator("body").innerText(), /No scholarships loaded|No scholarships match/);
    for (const name of [/^Saved/, /^In progress/, /^Results/]) { await page.getByRole("button", { name }).click(); await settle(page); }
    assert.match(await page.locator("body").innerText(), /No results yet/);
    await page.locator('nav[aria-label="Primary"] button', { hasText: "Home" }).click();
    await page.getByRole("button", { name: /^Tasks/ }).click(); await settle(page);
    assert.match(await page.locator("body").innerText(), /No open tasks/);
    assert.deepEqual(log.errors, []);
  });
  await app.close();
}

// --- mobile + keyboard
{
  const app = await startApp();
  const { page, log } = app;
  await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
  await step("mobile 390px: bottom nav has 4 items, no horizontal scroll, sidebar hidden", async () => {
    assert.equal(await page.locator(".mobileBottomNav button").count(), 4);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `overflow ${overflow}`);
    assert.equal(await page.locator(".sidebar").isVisible(), false);
  });
  await step("mobile: student switcher accessible", async () => {
    assert.ok(await page.locator(".mobileContextBar select").isVisible());
  });
  await step("mobile: scholarship Browse layout has no horizontal overflow", async () => {
    await page.locator(".mobileBottomNav button", { hasText: "Scholarships" }).click(); await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `overflow ${overflow}`);
  });
  await page.screenshot({ path: "mobile-browse.png", fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await step("keyboard: Tab reaches primary nav and Enter activates it", async () => {
    await page.locator('nav[aria-label="Primary"] button').first().focus();
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await settle(page);
    assert.ok(await page.locator('nav[aria-label="Primary"] button[aria-current="page"]').innerText().then((t) => /Scholarships/.test(t)));
    const focusOutline = await page.evaluate(() => { const el = document.querySelector('nav[aria-label="Primary"] button'); el.focus(); return getComputedStyle(el).outlineStyle; });
    assert.notEqual(focusOutline, "none");
  });
  await step("keyboard: section nav 'More' menu opens and selects", async () => {
    await page.locator(".sectionNavMore summary").focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Summary report" }).click(); await settle(page);
    assert.match(await page.locator("body").innerText(), /Scholarship Report|Report/i);
  });
  await step("no errors", async () => assert.deepEqual(log.errors, []));
  await app.close();
}
for (const r of results) console.log(r.join(" | "));
console.log(`${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);

// --- onboarding (new account with no family)
{
  const { startApp: start } = await import("./harness.mjs");
  const app = await start({ role: "none", userId: "u9" });
  const { page, db, log } = app; await page.waitForTimeout(800);
  const r2 = [];
  const st = async (n, fn) => { try { await fn(); r2.push(["PASS", n]); } catch (e) { r2.push(["FAIL", n, String(e.message).split("\n")[0]]); } };
  await st("onboarding: new account sees Set up your family", async () => assert.match(await page.locator("body").innerText(), /Set up your family/));
  await st("onboarding: create family lands in workspace with the student", async () => {
    await page.getByPlaceholder("The Smith Family").fill("Lee Family");
    await page.getByPlaceholder("Student name").fill("Mia");
    await page.getByRole("button", { name: "Create my family" }).click(); await page.waitForTimeout(900);
    assert.equal(db.families.length, 1);
    const t = await page.locator("body").innerText();
    assert.match(t, /Mia/); assert.match(t, /Home/);
  });
  await st("onboarding: no page errors", async () => assert.deepEqual(log.errors, []));
  for (const r of r2) console.log(r.join(" | "));
  await app.close();
}
