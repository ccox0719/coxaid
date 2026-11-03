export function listStudentAwards(supabase, familyId) {
  return supabase
    .from("student_awards")
    .select("*, student:students(*)")
    .eq("family_id", familyId)
    .order("date_earned", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
}

export function saveStudentAward(supabase, award) {
  return supabase.from("student_awards").insert(award).select("*, student:students(*)").single();
}

export function updateStudentAward(supabase, id, patch) {
  return supabase.from("student_awards").update(patch).eq("id", id).select("*, student:students(*)").single();
}

export function deleteStudentAward(supabase, id) {
  return supabase.from("student_awards").delete().eq("id", id);
}
