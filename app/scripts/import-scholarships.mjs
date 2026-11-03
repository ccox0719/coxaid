import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config();

const csvPath = process.argv[2] || path.join(root, "clean_military_dependent_scholarships.csv");
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
});

if (parsed.errors.length) {
  console.error(parsed.errors);
  process.exit(1);
}

const sourceFile = path.basename(csvPath);
const rows = parsed.data.map((row) => normalizeRow(row, sourceFile)).filter((row) => row.name);
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { error } = await client.from("scholarships").upsert(rows, { onConflict: "name" });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Imported ${rows.length} scholarships from ${csvPath}`);

function normalizeRow(row, sourceFile) {
  const rawDeadline = row.deadline?.trim() || null;

  return {
    name: row.name?.trim(),
    link: row.link?.trim() || null,
    award: row.award?.trim() || null,
    deadline: toDate(rawDeadline),
    deadline_raw: rawDeadline,
    status: row.status?.trim() || null,
    source_file: row.source_file?.trim() || sourceFile,
    last_verified_at: toDate(row.last_verified_at),
    eligibility_reason: row.eligibility_reason?.trim() || null,
    age_min: toInteger(row.age_min),
    age_max: toInteger(row.age_max),
    grade_requirement: row.grade_requirement?.trim() || null,
    eligible_now: toBool(row.eligible_now),
    eligible_soon: toBool(row.eligible_soon),
    priority_score: Number(row.priority_score || 0),
    notes: row.notes?.trim() || null,
  };
}

function toBool(value) {
  return ["true", "1", "yes", "y"].includes(String(value).trim().toLowerCase());
}

function toInteger(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
  const input = String(value || "").trim();
  if (!input) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return formatDate(year, month, day);
  }

  const slash = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return formatDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));

  const named = input.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(named[1].toLowerCase()) + 1;
    if (month) return formatDate(Number(named[3]), month, Number(named[2]));
  }

  return null;
}

function formatDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}
