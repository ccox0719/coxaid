export function listServiceLogs(supabase, familyId) {
  return supabase
    .from("service_logs")
    .select("*, student:students(*)")
    .eq("family_id", familyId)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export function saveServiceLog(supabase, log) {
  return supabase.from("service_logs").insert(log).select("*, student:students(*)").single();
}

export function updateServiceLog(supabase, id, patch) {
  return supabase.from("service_logs").update(patch).eq("id", id).select("*, student:students(*)").single();
}

export function deleteServiceLog(supabase, id) {
  return supabase.from("service_logs").delete().eq("id", id);
}

export function listServiceOrganizations(supabase, familyId) {
  return supabase
    .from("service_organizations")
    .select("*")
    .eq("family_id", familyId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });
}

export function saveServiceOrganization(supabase, organization) {
  return supabase.from("service_organizations").upsert(organization, { onConflict: "family_id,name" }).select().single();
}

export function updateServiceOrganization(supabase, id, patch) {
  return supabase.from("service_organizations").update(patch).eq("id", id).select().single();
}

export function deleteServiceOrganization(supabase, id) {
  return supabase.from("service_organizations").delete().eq("id", id);
}

export function listServiceAchievements(supabase, familyId) {
  return supabase
    .from("service_achievements")
    .select("*, student:students(*), service_log:service_logs(*)")
    .eq("family_id", familyId)
    .order("date_earned", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
}

export function saveServiceAchievement(supabase, achievement) {
  return supabase.from("service_achievements").insert(achievement).select("*, student:students(*), service_log:service_logs(*)").single();
}

export function updateServiceAchievement(supabase, id, patch) {
  return supabase.from("service_achievements").update(patch).eq("id", id).select("*, student:students(*), service_log:service_logs(*)").single();
}

export function deleteServiceAchievement(supabase, id) {
  return supabase.from("service_achievements").delete().eq("id", id);
}
