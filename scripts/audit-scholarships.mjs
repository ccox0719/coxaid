import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const equals = line.indexOf("=");
        return [line.slice(0, equals).trim(), line.slice(equals + 1).trim()];
      }),
  );
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function groupDuplicates(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({
      key,
      count: values.length,
      records: values.map(({ id, name, link }) => ({ id, name, link })),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function extractYears(value) {
  return [...new Set(String(value || "").match(/\b20\d{2}\b/g) || [])].map(Number);
}

async function checkUrl(row) {
  const url = String(row.link || row.source_url || "").trim();
  if (!url) return { id: row.id, name: row.name, url: null, category: "missing" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = { "user-agent": "Mozilla/5.0 CoxAid Scholarship Verifier/1.0" };
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    // Some scholarship sites reject or misroute HEAD while serving GET normally.
    if (response.status >= 400) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { ...headers, range: "bytes=0-2047" },
      });
    }
    const category =
      response.status >= 200 && response.status < 400
        ? "reachable"
        : [401, 403, 429].includes(response.status)
          ? "restricted"
          : [404, 410].includes(response.status)
            ? "broken"
            : "http_error";
    return {
      id: row.id,
      name: row.name,
      url,
      status: response.status,
      finalUrl: response.url,
      redirected: response.url !== url,
      category,
    };
  } catch (error) {
    return {
      id: row.id,
      name: row.name,
      url,
      category: error.name === "AbortError" ? "timeout" : "network_error",
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const env = parseEnv(await fs.readFile(envPath, "utf8"));
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
}

const response = await fetch(
  `${env.SUPABASE_URL}/rest/v1/scholarships?select=*&order=name.asc`,
  {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  },
);
if (!response.ok) throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
const rows = await response.json();
const now = new Date();
const currentYear = now.getUTCFullYear();

const missingFields = {};
for (const field of [
  "name",
  "link",
  "award",
  "deadline",
  "deadline_raw",
  "grade_requirement",
  "eligible_grade_levels",
  "source_url",
  "last_verified_at",
  "application_cycle",
  "estimated_completion_minutes",
]) {
  missingFields[field] = rows.filter((row) => {
    const value = row[field];
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  }).length;
}

const exactNameDuplicates = groupDuplicates(rows, (row) => normalize(row.name));
const duplicateLinks = groupDuplicates(rows, (row) => {
  try {
    const url = new URL(row.link);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return normalize(row.link);
  }
});

const pastStructuredDeadlines = rows
  .filter((row) => row.deadline && new Date(`${row.deadline}T23:59:59Z`) < now)
  .map(({ id, name, deadline, deadline_raw, scholarship_status }) => ({
    id,
    name,
    deadline,
    deadline_raw,
    scholarship_status,
  }));

const staleYearReferences = rows
  .map((row) => ({
    id: row.id,
    name: row.name,
    deadline_raw: row.deadline_raw,
    years: extractYears(row.deadline_raw).filter((year) => year < currentYear),
  }))
  .filter((row) => row.years.length > 0);

const links = await mapConcurrent(rows, 12, checkUrl);
const linkCounts = links.reduce((counts, item) => {
  counts[item.category] = (counts[item.category] || 0) + 1;
  return counts;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  database: env.SUPABASE_URL,
  recordCount: rows.length,
  statusCounts: rows.reduce((counts, row) => {
    const key = row.scholarship_status || "missing";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}),
  missingFields,
  exactNameDuplicates,
  duplicateLinks,
  pastStructuredDeadlines,
  staleYearReferences,
  linkCounts,
  links,
};

const reportDir = path.join(root, "reports");
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(
  path.join(reportDir, "scholarship-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const problemLinks = links.filter((item) => !["reachable", "restricted"].includes(item.category));
const markdown = `# Scholarship database audit

Generated: ${report.generatedAt}

## Summary

- Records: ${rows.length}
- Scholarship statuses: ${Object.entries(report.statusCounts).map(([key, count]) => `${key}: ${count}`).join(", ")}
- Link checks: ${Object.entries(linkCounts).map(([key, count]) => `${key}: ${count}`).join(", ")}
- Exact-name duplicate groups: ${exactNameDuplicates.length}
- Duplicate-link groups: ${duplicateLinks.length}
- Past structured deadlines: ${pastStructuredDeadlines.length}
- Records referencing a year before ${currentYear}: ${staleYearReferences.length}

## Missing fields

${Object.entries(missingFields).map(([field, count]) => `- ${field}: ${count}`).join("\n")}

## Exact-name duplicate groups

${exactNameDuplicates.length ? exactNameDuplicates.map((group) => `- ${group.records.map((item) => item.name).join(" / ")} (${group.records.map((item) => item.id).join(", ")})`).join("\n") : "None."}

## Links needing manual review

${problemLinks.length ? problemLinks.map((item) => `- ${item.name}: ${item.category}${item.status ? ` (${item.status})` : ""} — ${item.url || "no URL"}`).join("\n") : "None."}
`;

await fs.writeFile(path.join(reportDir, "scholarship-audit.md"), markdown, "utf8");
console.log(JSON.stringify({
  recordCount: report.recordCount,
  statusCounts: report.statusCounts,
  missingFields,
  exactNameDuplicateGroups: exactNameDuplicates.length,
  duplicateLinkGroups: duplicateLinks.length,
  pastStructuredDeadlines: pastStructuredDeadlines.length,
  staleYearReferences: staleYearReferences.length,
  linkCounts,
  report: "reports/scholarship-audit.md",
}, null, 2));
