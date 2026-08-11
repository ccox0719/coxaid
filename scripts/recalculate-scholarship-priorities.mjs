import fs from "node:fs/promises";
import path from "node:path";

function parseEnv(text) {
  return Object.fromEntries(
    text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const equals = line.indexOf("=");
        return [line.slice(0, equals).trim(), line.slice(equals + 1).trim()];
      }),
  );
}

function maximumDollarAmount(row) {
  const text = `${row.award || ""} ${row.estimated_total_value || ""}`;
  const amounts = [...text.matchAll(/\$\s*([\d,.]+)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter(Number.isFinite);
  return amounts.length ? Math.max(...amounts) : 0;
}

function hasMajorValue(row) {
  const text = `${row.award || ""} ${row.estimated_total_value || ""}`.toLowerCase();
  return maximumDollarAmount(row) >= 10000 ||
    /full tuition|full cost|cost of attendance|100 percent of tuition|tuition covered/.test(text);
}

function scoreScholarship(row, today) {
  const reasons = [];
  const deadline = row.deadline ? new Date(`${row.deadline}T23:59:59Z`) : null;
  const days = deadline ? Math.ceil((deadline - today) / 86400000) : null;

  if (["inactive", "expired"].includes(row.scholarship_status)) {
    return { score: 0, tier: "Closed", reasons: ["The current application cycle is closed"] };
  }
  if (days != null && days < 0) {
    return { score: 0, tier: "Closed", reasons: ["The recorded deadline has passed"] };
  }

  let score;
  if (row.eligible_now) {
    score = 3;
    reasons.push("Eligible now");
  } else if (row.eligible_soon) {
    score = 2;
    reasons.push("Future-fit opportunity");
  } else {
    score = 1;
    reasons.push("No current eligibility match recorded");
  }

  if (row.scholarship_status === "active") {
    score += 1;
    reasons.push("Official source verified active");
  }
  if (days != null && days <= 60) {
    score += 1;
    reasons.push(`${days} days until deadline`);
  }
  if (hasMajorValue(row)) {
    score += 1;
    reasons.push("Major award value");
  }

  if (row.scholarship_status === "needs_verification" && score > 3) {
    score = 3;
    reasons.push("Capped until source verification is complete");
  }

  score = Math.max(0, Math.min(5, Math.round(score)));
  const tier = score === 5 ? "Act now" : score === 4 ? "Strong target" : score === 3 ? "Research" : score === 2 ? "Prepare later" : "Low match";
  return { score, tier, reasons };
}

function distribution(rows, field) {
  return Object.fromEntries(
    [...rows.reduce((map, row) => map.set(row[field], (map.get(row[field]) || 0) + 1), new Map())]
      .sort(([a], [b]) => Number(a) - Number(b)),
  );
}

const root = process.cwd();
const env = parseEnv(await fs.readFile(path.join(root, ".env.local"), "utf8"));
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

const response = await fetch(`${env.SUPABASE_URL}/rest/v1/scholarships?select=*&order=name.asc`, { headers });
if (!response.ok) throw new Error(`Scholarship read failed: ${response.status}`);
const rows = await response.json();
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const proposals = rows.map((row) => {
  const result = scoreScholarship(row, today);
  return {
    id: row.id,
    name: row.name,
    oldPriority: Number(row.priority_score || 0),
    newPriority: result.score,
    tier: result.tier,
    reasons: result.reasons,
    changed: Number(row.priority_score || 0) !== result.score,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  total: proposals.length,
  changed: proposals.filter((item) => item.changed).length,
  before: distribution(rows, "priority_score"),
  after: distribution(proposals.map((item) => ({ priority: item.newPriority })), "priority"),
};

await fs.mkdir(path.join(root, "reports"), { recursive: true });
await fs.writeFile(
  path.join(root, "reports", "scholarship-priority-review.json"),
  `${JSON.stringify({ summary, proposals }, null, 2)}\n`,
  "utf8",
);

if (process.argv.includes("--apply")) {
  for (const proposal of proposals.filter((item) => item.changed)) {
    const update = await fetch(
      `${env.SUPABASE_URL}/rest/v1/scholarships?id=eq.${proposal.id}&priority_score=eq.${proposal.oldPriority}`,
      {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ priority_score: proposal.newPriority }),
      },
    );
    if (!update.ok) throw new Error(`Priority update failed for ${proposal.name}: ${update.status} ${await update.text()}`);
  }
}

console.log(JSON.stringify({ ...summary, applied: process.argv.includes("--apply") }, null, 2));
