import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import crypto from "node:crypto";

const DIST = path.join(path.dirname(new URL(import.meta.url).pathname), "dist-mock");
const uuid = () => crypto.randomUUID();
const today = new Date();
const iso = (days) => { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

export function seed() {
  const family = { id: "fam1", name: "Cox", created_at: "2026-01-01" };
  const mkStudent = (id, name, grade) => ({ id, family_id: "fam1", name, grade_level: grade, gpa: "3.9", activities: [], awards: [], career_interests: [] });
  const students = [mkStudent("s1", "Jaden", "12th Grade"), mkStudent("s2", "Elsie", "10th Grade")];
  const sch = (id, name, extra) => ({ id, family_id: "fam1", name, link: "", award: "", deadline: null, deadline_raw: null, tags: [], priority_score: 3, eligible_now: false, eligible_soon: true, status: "Open", last_verified_at: null, notes: "", eligibility_reason: "", ...extra });
  const scholarships = [
    sch("c1", "Exact Deadline Award", { award: "$2,000", deadline: iso(10), eligible_now: true, last_verified_at: "2026-09-01", eligibility_reason: "Seniors in Iowa" }),
    sch("c2", "Text Deadline Award", { award: "$500", deadline_raw: "March 1", grade_requirement: "12th Grade" }),
    sch("c3", "No Info Award", { eligible_soon: false }),
    sch("c4", "Past Due Award", { award: "$1,000", deadline: iso(-5), eligible_now: true }),
    sch("c5", "Veteran Family Grant", { award: "$3,000", deadline: iso(30), eligible_now: true, tags: ["veteran dependent"] }),
  ];
  return {
    families: [family],
    family_members: [{ id: "m1", family_id: "fam1", user_id: "u1", role: "family_admin", student_id: null, created_at: "2026-01-01", family }],
    students, scholarships,
    student_scholarships: [], application_workspaces: [], tasks: [], answer_bank: [], answer_snippets: [],
    service_logs: [], student_awards: [],
  };
}

const EMBED = { student: "students", scholarship: "scholarships", school: "schools", family: "families", workspace: "application_workspaces", answer: "answer_bank" };

export async function startApp({ role = "parent", userId = "u1", studentId = null, db = seed(), failTable = null } = {}) {
  if (role === "student") db.family_members = [{ id: "m2", family_id: "fam1", user_id: userId, role: "student", student_id: studentId, created_at: "2026-01-01", family: db.families[0] }];
  const log = { requests: [], errors: [], consoleErrors: [] };
  const server = http.createServer((req, res) => {
    let p = path.join(DIST, req.url.split("?")[0]);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
    const ext = path.extname(p);
    res.setHeader("Content-Type", { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/json" }[ext] || "application/octet-stream");
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const session = { access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, user: { id: userId, email: `${userId}@example.com`, aud: "authenticated" } };
  await context.addInitScript((s) => { try { localStorage.setItem("sb-mock-auth-token", JSON.stringify(s)); } catch {} }, session);

  const match = (row, params) => {
    for (const [k, v] of params) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
      if (v.startsWith("eq.")) { if (String(row[k]) !== v.slice(3)) return false; }
      else if (v.startsWith("in.")) { if (!v.slice(4, -1).split(",").includes(String(row[k]))) return false; }
      else if (v.startsWith("neq.")) { if (String(row[k]) === v.slice(4)) return false; }
    }
    return true;
  };
  const embed = (row) => {
    const out = { ...row };
    for (const [name, table] of Object.entries(EMBED)) {
      const fk = `${name}_id`;
      if (fk in row) out[name] = (db[table] || []).find((r) => r.id === row[fk]) || null;
    }
    return out;
  };
  const syncStatus = (table, row) => {
    if (table === "student_scholarships") {
      const w = db.application_workspaces.find((x) => x.student_id === row.student_id && x.scholarship_id === row.scholarship_id);
      if (w && row.application_status !== "Not Eligible") w.status = row.application_status;
    } else if (table === "application_workspaces") {
      const t = db.student_scholarships.find((x) => x.student_id === row.student_id && x.scholarship_id === row.scholarship_id);
      if (t) t.application_status = row.status; else db.student_scholarships.push({ id: uuid(), family_id: row.family_id, student_id: row.student_id, scholarship_id: row.scholarship_id, application_status: row.status, deadline: row.deadline || null, created_at: new Date().toISOString() });
    }
  };

  await context.route("https://mock.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.startsWith("/auth/v1")) return route.fulfill({ status: 200, headers, body: JSON.stringify(session.user) });
    const m = url.pathname.match(/^\/rest\/v1\/(.+)$/);
    if (!m) return route.fulfill({ status: 404, headers, body: "{}" });
    const target = m[1];
    log.requests.push(`${method} ${target}`);
    if (failTable && target === failTable) return route.fulfill({ status: 500, headers, body: JSON.stringify({ message: `forced failure on ${target}` }) });
    if (target.startsWith("rpc/")) {
      if (target === "rpc/generate_application_tasks") {
        const body = JSON.parse(req.postData() || "{}");
        const t = db.student_scholarships.find((x) => x.id === body.target_student_scholarship_id);
        let inserted = 0;
        for (const title of ["Review requirements", "Draft essay", "Gather transcript"]) {
          if (!db.tasks.some((x) => x.student_id === t.student_id && x.scholarship_id === t.scholarship_id && x.title === title)) { db.tasks.push({ id: uuid(), family_id: t.family_id, student_id: t.student_id, scholarship_id: t.scholarship_id, title, due_date: null, completed: false, required: true }); inserted++; }
        }
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ inserted_count: inserted, message: inserted ? "Application tasks created." : "Tasks already created for this application." }]) });
      }
      return route.fulfill({ status: 200, headers, body: "[]" });
    }
    db[target] ||= [];
    const rows = db[target];
    const prefer = req.headers()["prefer"] || "";
    const wantObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const respond = (data, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(wantObject ? (Array.isArray(data) ? data[0] ?? null : data) : data) });
    if (method === "GET") {
      let out = rows.filter((r) => match(r, url.searchParams));
      // approximate RLS for a student login: only their own student row / student-scoped rows
      if (role === "student") out = out.filter((r) => target === "students" ? r.id === studentId : ("student_id" in r ? r.student_id === studentId : true));
      return respond(out.map(embed));
    }
    if (method === "POST") {
      const body = JSON.parse(req.postData() || "[]");
      const list = Array.isArray(body) ? body : [body];
      const out = [];
      const conflict = url.searchParams.get("on_conflict");
      for (const item of list) {
        const cols = conflict ? conflict.split(",") : null;
        const existing = cols ? rows.find((r) => cols.every((c) => String(r[c]) === String(item[c]))) : null;
        if (existing && prefer.includes("merge-duplicates")) { Object.assign(existing, item); syncStatus(target, existing); out.push(existing); }
        else { const row = { id: uuid(), created_at: new Date().toISOString(), completed: false, ...item }; rows.push(row); syncStatus(target, row); out.push(row); }
      }
      return prefer.includes("return=representation") ? respond(out, 201) : route.fulfill({ status: 201, headers, body: "" });
    }
    if (method === "PATCH") {
      const body = JSON.parse(req.postData() || "{}");
      const hit = rows.filter((r) => match(r, url.searchParams));
      hit.forEach((r) => { Object.assign(r, body); syncStatus(target, r); });
      return prefer.includes("return=representation") ? respond(hit) : route.fulfill({ status: 204, headers, body: "" });
    }
    if (method === "DELETE") {
      const hit = rows.filter((r) => match(r, url.searchParams));
      db[target] = rows.filter((r) => !hit.includes(r));
      return prefer.includes("return=representation") ? respond(hit) : route.fulfill({ status: 204, headers, body: "" });
    }
    return route.fulfill({ status: 405, headers, body: "{}" });
  });

  const page = await context.newPage();
  page.on("pageerror", (e) => log.errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") log.consoleErrors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`);
  return { page, db, log, close: async () => { await browser.close(); server.close(); } };
}
