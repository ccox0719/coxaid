export function listLocalScholarshipLeads(supabase, familyId) {
  return supabase
    .from("local_scholarship_leads")
    .select("*")
    .eq("family_id", familyId)
    .order("follow_up_date", { ascending: true, nullsFirst: false });
}

export function createLocalScholarshipLead(supabase, lead) {
  return supabase.from("local_scholarship_leads").insert(lead).select().single();
}

export function updateLocalScholarshipLead(supabase, id, patch) {
  return supabase.from("local_scholarship_leads").update(patch).eq("id", id).select().single();
}

export function archiveLocalScholarshipLead(supabase, id) {
  return updateLocalScholarshipLead(supabase, id, { lead_status: "Not a Fit" });
}

export function convertLocalLeadToScholarship(supabase, lead) {
  return supabase.from("scholarships").upsert(
    {
      name: lead.title,
      link: lead.application_link || lead.website || null,
      award: lead.estimated_award || null,
      deadline: null,
      deadline_raw: lead.typical_deadline || null,
      status: "Local lead",
      source_file: "local_scholarship_leads",
      eligibility_reason: `${lead.organization_name}${lead.possible_fit_tags?.length ? `: ${lead.possible_fit_tags.join(", ")}` : ""}`,
      notes: lead.notes || null,
    },
    { onConflict: "name" },
  );
}
