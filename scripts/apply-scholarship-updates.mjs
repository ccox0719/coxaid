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

const official = {
  fraList: "https://fra.org/fra/Web/Web/Content/FRA_Scholarships.aspx",
  fraApplication: "https://fra.org/foundation/",
  sfm: "https://www.sfmfoundation.com/apply/",
  drake: "https://www.drake.edu/admission-aid/financial-aid/promise",
  calvet: "https://www.calvet.ca.gov/VetServices/Pages/College-Fee-Waiver.aspx",
  nhasf: "https://www.nhascholarshipfund.org/",
  carson: "https://carsonscholars.org/nomination-rules-and-policies/",
  asianFair: "https://tcasianfair.org/scholarships/",
  benGlass: "https://www.benglasslaw.com/scholarship/",
  regions: "https://www.regions.com/about-regions/inclusion-belonging-impact/supporting-communities/essay-contest-scholarship",
};

const fraIds = [
  "55005d26-4c6e-4d44-9a2e-410edb24ada1",
  "7ce00871-0b60-4d84-826d-6ce9d4f788f8",
  "465234d5-6724-482d-8ec1-263a3bb488b7",
  "c6f4b8cb-4b2a-4328-bafe-a3caf682e1eb",
  "d0db252f-d0e7-451a-ac69-640109140521",
  "7014a145-4d66-4716-8696-353ddc5e51c3",
  "671dcd76-b80d-4b7c-ab39-fc51e257fa7d",
  "e774a629-162c-4191-9762-4b9b37fdc926",
  "5f262095-f7ea-40ba-bb91-875f8f60c700",
];

const verifiedAt = new Date().toISOString();
const updates = [
  ...fraIds.map((id) => ({
    id,
    expectedStatus: "needs_verification",
    values: {
      link: official.fraList,
      source_url: official.fraApplication,
      deadline: "2027-04-15",
      deadline_raw: "April 15, 2027; 2027 applications available September 2026",
      application_cycle: "2027",
      scholarship_status: "active",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  })),
  {
    id: "3ebdc5c2-f96a-4ce8-9bf9-a292a2f52cdc",
    expectedStatus: "needs_verification",
    values: {
      link: official.sfm,
      source_url: official.sfm,
      deadline: "2027-03-31",
      deadline_raw: "March 31, 2027 for the 2027-28 academic year",
      application_cycle: "2027-28",
      scholarship_status: "active",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "36f5dc70-179b-4407-a529-7287e21e6e80",
    expectedStatus: "needs_verification",
    values: {
      link: official.drake,
      source_url: official.drake,
      deadline_raw: "Admission materials due March 1; FAFSA due July 1 before fall enrollment",
      application_cycle: "Fall 2026 and later",
      scholarship_status: "active",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "dd282c6a-f864-4704-a453-90515b3dfed2",
    expectedStatus: "needs_verification",
    values: {
      link: official.calvet,
      source_url: official.calvet,
      deadline_raw: "Apply annually through a California County Veterans Service Office before campus processing deadlines",
      application_cycle: "Annual",
      scholarship_status: "active",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "77353d87-c40a-4be7-9163-b292386dde4c",
    expectedStatus: "needs_verification",
    values: {
      link: official.nhasf,
      source_url: official.nhasf,
      deadline: "2026-01-31",
      deadline_raw: "2025-26 cycle closed January 31, 2026; next cycle dates not yet posted",
      application_cycle: "2025-26",
      scholarship_status: "inactive",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "a9b3c75e-7fbe-4728-97b4-66df3f7a2b41",
    expectedStatus: "needs_verification",
    values: {
      link: official.carson,
      source_url: official.carson,
      deadline: "2026-01-11",
      deadline_raw: "2026 cycle closed January 11, 2026; school nomination closed December 17, 2025",
      application_cycle: "2026",
      scholarship_status: "inactive",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "19e9fc8b-a688-4f50-a21b-5611ceddc784",
    expectedStatus: "needs_verification",
    values: {
      link: official.asianFair,
      source_url: official.asianFair,
      grade_requirement: "Minnesota 12th-grade high school student",
      eligible_grade_levels: ["12"],
      application_cycle: "2026",
      scholarship_status: "inactive",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "fe830d55-b3f7-40f7-81a8-9a350f9f681b",
    expectedStatus: "needs_verification",
    values: {
      link: official.benGlass,
      source_url: official.benGlass,
      application_cycle: "Spring 2026",
      scholarship_status: "inactive",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
  {
    id: "dd52f9ba-6061-44ea-a9ca-0f94713dc80b",
    expectedStatus: "needs_verification",
    values: {
      link: official.regions,
      source_url: official.regions,
      deadline: "2026-09-30",
      deadline_raw: "Q3 deadline September 30, 2026; Q4 runs October 1-December 31, 2026",
      application_cycle: "2026 quarterly contests",
      scholarship_status: "active",
      last_verified_at: verifiedAt,
      deadline_verified_at: verifiedAt,
    },
  },
];

const env = parseEnv(await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8"));
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

const ids = updates.map(({ id }) => id).join(",");
const currentResponse = await fetch(
  `${env.SUPABASE_URL}/rest/v1/scholarships?select=id,name,scholarship_status&id=in.(${ids})`,
  { headers },
);
if (!currentResponse.ok) throw new Error(`Preflight read failed: ${currentResponse.status}`);
const currentRows = await currentResponse.json();
const currentById = new Map(currentRows.map((row) => [row.id, row]));

for (const update of updates) {
  const current = currentById.get(update.id);
  if (!current) throw new Error(`Record not found: ${update.id}`);
  if (current.scholarship_status !== update.expectedStatus) {
    throw new Error(`Unexpected status for ${current.name}: ${current.scholarship_status}`);
  }
}

if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify(updates.map((update) => ({
    id: update.id,
    name: currentById.get(update.id).name,
    values: update.values,
  })), null, 2));
  console.log(`Dry run only. Re-run with --apply to update ${updates.length} records.`);
  process.exit(0);
}

const changed = [];
for (const update of updates) {
  const patchResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/scholarships?id=eq.${update.id}&scholarship_status=eq.${update.expectedStatus}`,
    {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json", prefer: "return=representation" },
      body: JSON.stringify(update.values),
    },
  );
  if (!patchResponse.ok) {
    throw new Error(`Update failed for ${update.id}: ${patchResponse.status} ${await patchResponse.text()}`);
  }
  const rows = await patchResponse.json();
  if (rows.length !== 1) throw new Error(`Concurrent update detected for ${update.id}`);
  changed.push({ id: rows[0].id, name: rows[0].name, scholarship_status: rows[0].scholarship_status });
}

console.log(JSON.stringify({ updated: changed.length, changed }, null, 2));
