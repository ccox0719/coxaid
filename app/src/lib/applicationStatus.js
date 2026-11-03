// Single authoritative application status model.
//
// The database stores one enum (public.application_status) on both
// student_scholarships.application_status and application_workspaces.status,
// kept in sync by triggers. The UI maps those raw values to a small set of
// stages. Raw values are never rewritten by this mapping; "Offered" and
// "Accepted" (not in the current enum, but referenced by older UI code) are
// read as Awarded so no meaning is lost.

export const STAGES = [
  { key: "saved", label: "Saved", view: "saved", statuses: ["Not Started", "Researching"], write: "Researching" },
  { key: "preparing", label: "Preparing", view: "progress", statuses: ["Drafting"], write: "Drafting" },
  { key: "needs_review", label: "Needs review", view: "progress", statuses: ["Needs Review"], write: "Needs Review" },
  { key: "ready", label: "Ready to submit", view: "progress", statuses: ["Ready to Submit"], write: "Ready to Submit" },
  { key: "submitted", label: "Submitted", view: "results", statuses: ["Submitted"], write: "Submitted" },
  { key: "awarded", label: "Awarded", view: "results", statuses: ["Won", "Offered", "Accepted"], write: "Won" },
  { key: "not_selected", label: "Not selected", view: "results", statuses: ["Lost"], write: "Lost" },
  { key: "not_eligible", label: "Not eligible", view: "hidden", statuses: ["Not Eligible"], write: "Not Eligible" },
];

export const SCHOLARSHIP_VIEWS = [
  { key: "browse", label: "Browse" },
  { key: "saved", label: "Saved" },
  { key: "progress", label: "In progress" },
  { key: "results", label: "Results" },
];

export function stageByKey(key) {
  return STAGES.find((stage) => stage.key === key) || STAGES[0];
}

export function stageOf(status) {
  return STAGES.find((stage) => stage.statuses.includes(status)) || STAGES[0];
}

export function stageTone(stageKey) {
  return {
    saved: "neutral",
    preparing: "blue",
    needs_review: "yellow",
    ready: "yellow",
    submitted: "green",
    awarded: "green",
    not_selected: "red",
    not_eligible: "red",
  }[stageKey] || "neutral";
}

// Which stage a user may move an application to from the application card.
export const SELECTABLE_STAGES = ["saved", "preparing", "needs_review", "ready", "submitted", "awarded", "not_selected"];

export function nextActionFor(stageKey, { openTaskCount = 0 } = {}) {
  switch (stageKey) {
    case "saved": return "Start application";
    case "preparing": return openTaskCount ? `Finish ${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}` : "Mark ready for review";
    case "needs_review": return "Review and mark ready";
    case "ready": return "Submit, then record it";
    case "submitted": return "Record the result";
    case "awarded": return "Add to Awards";
    case "not_selected": return "No action needed";
    default: return "";
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Only exact calendar dates count as a known deadline. Free-text deadlines
// ("March 1", "Spring") are shown as-is with a "needs checking" label and are
// never turned into a guessed date.
export function deadlineInfo(scholarship, tracker, today = new Date()) {
  const exact = [tracker?.deadline, scholarship?.scholarship_deadline, scholarship?.deadline].find((value) => ISO_DATE.test(String(value || "")));
  if (exact) {
    const [y, m, d] = exact.split("-").map(Number);
    const due = new Date(y, m - 1, d);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((due - start) / 86400000);
    return { known: true, date: exact, days, label: formatDeadline(exact), pastDue: days < 0 };
  }
  const raw = String(scholarship?.deadline_raw || "").trim();
  return { known: false, date: null, days: null, label: "Deadline needs checking", raw: raw || null, pastDue: false };
}

export function formatDeadline(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function amountLabel(scholarship) {
  const text = String(scholarship?.award || "").trim();
  return text || "Amount varies";
}

// Verification is about the scholarship record; eligibility is about the student.
export function verificationInfo(scholarship) {
  const at = String(scholarship?.last_verified_at || "").slice(0, 10);
  if (ISO_DATE.test(at)) return { verified: true, label: `Verified ${formatDeadline(at)}` };
  return { verified: false, label: "Unverified" };
}

export function eligibilityInfo(scholarship, tracker) {
  if (tracker?.application_status === "Not Eligible") return { key: "not_eligible", label: "Marked not eligible" };
  if (scholarship?.eligible_now) return { key: "likely", label: "Looks eligible now" };
  if (scholarship?.eligible_soon) return { key: "soon", label: "May be eligible soon" };
  return { key: "unknown", label: "Eligibility unknown" };
}
