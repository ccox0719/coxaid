export function listSchools(supabase) {
  return supabase.from("schools").select("*").order("name");
}

export function upsertSchool(supabase, school) {
  return supabase.from("schools").upsert(school, { onConflict: "name" }).select().single();
}

export function updateSchool(supabase, id, patch) {
  return supabase.from("schools").update(patch).eq("id", id).select().single();
}

export function deleteSchool(supabase, id) {
  return supabase.from("schools").delete().eq("id", id);
}

export function listStudentSchoolOptions(supabase, familyId) {
  return supabase
    .from("student_school_options")
    .select("*, school:schools(*)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
}

export function upsertStudentSchoolOption(supabase, option) {
  return supabase.from("student_school_options").upsert(option, { onConflict: "student_id,school_id" }).select().single();
}

export function updateStudentSchoolOption(supabase, id, patch) {
  return supabase.from("student_school_options").update(patch).eq("id", id).select().single();
}

export function deleteStudentSchoolOption(supabase, id) {
  return supabase.from("student_school_options").delete().eq("id", id);
}

export function listSchoolComparisonNotes(supabase, familyId) {
  return supabase
    .from("school_comparison_notes")
    .select("*, school:schools(*)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
}

export function saveSchoolComparisonNote(supabase, note) {
  return supabase.from("school_comparison_notes").insert(note).select().single();
}

export function updateSchoolComparisonNote(supabase, id, patch) {
  return supabase.from("school_comparison_notes").update(patch).eq("id", id).select().single();
}

export function deleteSchoolComparisonNote(supabase, id) {
  return supabase.from("school_comparison_notes").delete().eq("id", id);
}
