import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config();
const dryRun = process.argv.includes("--dry-run");
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.SCHOLARSHIP_DISCOVERY_MODEL || "gpt-5-mini";
const today = new Date().toISOString().slice(0, 10);

if (!supabaseUrl || !serviceRoleKey) fail("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
if (!openaiApiKey) fail("Missing OPENAI_API_KEY. Add it to .env.local or the environment.");

const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const existing = await fetchExisting();
const candidates = await discover(existing.knownNames);
const acceptedNames = new Set();
const acceptedLinks = new Set();
const accepted = [];

for (const candidate of candidates) {
  const result = validate(candidate, existing, acceptedNames, acceptedLinks);
  if (!result.ok) {
    console.log(`Rejected ${displayName(candidate)}: ${result.reason}`);
    continue;
  }
  accepted.push(result.row);
  acceptedNames.add(normalizeName(result.row.name));
  acceptedLinks.add(normalizeLink(result.row.link));
}

console.log(`Discovery returned ${candidates.length} candidate(s); accepted ${accepted.length}.`);
if (dryRun) {
  console.log("Dry run: no rows written.");
  console.log(JSON.stringify(accepted, null, 2));
  process.exit(0);
}
if (!accepted.length) process.exit(0);
const { error } = await client.from("scholarships").upsert(accepted, { onConflict: "name", ignoreDuplicates: true });
if (error) fail(error.message);
console.log(`Inserted up to ${accepted.length} auto-discovered scholarship(s).`);

async function fetchExisting() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("scholarships").select("name, link").range(from, from + 999);
    if (error) throw new Error(`Could not fetch existing scholarships: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { names: new Set(rows.map((row) => normalizeName(row.name)).filter(Boolean)), links: new Set(rows.map((row) => normalizeLink(row.link)).filter(Boolean)), knownNames: rows.map((row) => row.name).filter(Boolean) };
}

async function discover(knownNames) {
  const prompt = `Find up to 25 NEW scholarships for Grandview Christian School students in Iowa, near Des Moines. They often attend Cedarville University in Ohio or Iowa colleges. Return ONLY a JSON array with no markdown. Search priorities: (1) Cedarville University merit, Christian leadership, and military/dependent scholarships; (2) Iowa state aid, Iowa Tuition Grant, foundations, and central-Iowa community foundations; (3) Dordt, Northwestern, Central, Drake, Grand View, Iowa State, Iowa, and UNI; (4) national Christian, private/homeschool, and military-family awards; (5) Grandview Christian School/community opportunities. Use ONLY official school, government, foundation, or organization pages and a specific HTTPS scholarship/grant page, never an aggregator. Exclude fees, SSN/payment requests, scams, sweepstakes, passed deadlines, and items without a stated deadline. Annual deadlines must use the next upcoming YYYY-MM-DD. Every item has exactly: name, link, award, deadline, deadline_raw, eligibility_reason, grade_requirement, age_min, age_max, priority_score, tags, notes. deadline must be YYYY-MM-DD; optional values use null; tags is an array; priority_score is 1-5; eligibility_reason is one sentence explaining Grandview-Christian fit. Skip known names: ${JSON.stringify(knownNames)}`;
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, tools: [{ type: "web_search" }], input: prompt }) });
  if (!response.ok) throw new Error(`OpenAI scholarship discovery failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("");
  if (!text) throw new Error("OpenAI returned no discovery text.");
  const parsed = JSON.parse(text);
  const results = Array.isArray(parsed) ? parsed : parsed.scholarships;
  if (!Array.isArray(results)) throw new Error("OpenAI response was not a JSON scholarship array.");
  return results.slice(0, 25);
}

function validate(candidate, existing, acceptedNames, acceptedLinks) {
  if (!candidate || typeof candidate !== "object") return { ok: false, reason: "not an object" };
  const name = String(candidate.name || "").trim();
  const link = String(candidate.link || "").trim();
  const deadline = String(candidate.deadline || "").trim();
  const normalizedName = normalizeName(name);
  const normalizedLink = normalizeLink(link);
  if (!name) return { ok: false, reason: "missing name" };
  if (!isHttps(link)) return { ok: false, reason: "link is not HTTPS" };
  if (!candidate.deadline_raw || !String(candidate.deadline_raw).trim()) return { ok: false, reason: "missing deadline information" };
  if (!isValidDate(deadline)) return { ok: false, reason: "deadline is missing or malformed" };
  if (deadline < today) return { ok: false, reason: `deadline ${deadline} has passed` };
  if (existing.names.has(normalizedName) || acceptedNames.has(normalizedName)) return { ok: false, reason: "duplicate name" };
  if (existing.links.has(normalizedLink) || acceptedLinks.has(normalizedLink)) return { ok: false, reason: "duplicate link" };
  const ageMin = toInteger(candidate.age_min);
  const ageMax = toInteger(candidate.age_max);
  if ((candidate.age_min != null && ageMin == null) || (candidate.age_max != null && ageMax == null) || (ageMin != null && ageMax != null && ageMin > ageMax)) return { ok: false, reason: "invalid age range" };
  const priority = Number(candidate.priority_score);
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) return { ok: false, reason: "priority_score must be 1 through 5" };
  if (!Array.isArray(candidate.tags) || candidate.tags.some((tag) => typeof tag !== "string")) return { ok: false, reason: "tags must be an array of strings" };
  return { ok: true, row: { name, link, award: textOrNull(candidate.award), deadline, deadline_raw: String(candidate.deadline_raw).trim(), status: "Auto-discovered", source_file: `auto-discovery-${today}`, last_verified_at: today, eligibility_reason: textOrNull(candidate.eligibility_reason), grade_requirement: textOrNull(candidate.grade_requirement), age_min: ageMin, age_max: ageMax, eligible_now: true, eligible_soon: false, priority_score: priority, tags: candidate.tags.map((tag) => tag.trim()).filter(Boolean), notes: textOrNull(candidate.notes) } };
}
function normalizeName(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalizeLink(value) { try { const url = new URL(value); return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "") || "/"}`; } catch { return ""; } }
function isHttps(value) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function isValidDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value; }
function toInteger(value) { if (value == null || value === "") return null; const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : null; }
function textOrNull(value) { const text = String(value || "").trim(); return text || null; }
function displayName(candidate) { return candidate?.name ? JSON.stringify(String(candidate.name)) : "unnamed candidate"; }
function fail(message) { console.error(message); process.exit(1); }
