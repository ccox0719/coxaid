export function listScholarshipTaskTemplates(supabase) {
  return supabase
    .from("scholarship_task_templates")
    .select("*")
    .order("sort_order", { ascending: true });
}

export function saveScholarshipTaskTemplate(supabase, template) {
  return supabase
    .from("scholarship_task_templates")
    .upsert(template, { onConflict: "scholarship_id,title" })
    .select()
    .single();
}

export function deleteScholarshipTaskTemplate(supabase, id) {
  return supabase.from("scholarship_task_templates").delete().eq("id", id);
}

export function seedDefaultScholarshipTaskTemplates(supabase, scholarshipId) {
  return supabase.rpc("seed_default_scholarship_task_templates", {
    target_scholarship_id: scholarshipId,
  });
}

export function generateApplicationTasks(supabase, studentScholarshipId) {
  return supabase.rpc("generate_application_tasks", {
    target_student_scholarship_id: studentScholarshipId,
  });
}
