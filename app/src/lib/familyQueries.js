export function listFamilies(supabase) {
  return supabase.from("families").select("*").order("created_at", { ascending: true });
}

export function listFamilyMemberships(supabase) {
  return supabase
    .from("family_members")
    .select("*, family:families(*), student:students(*)")
    .order("created_at", { ascending: true });
}

export function listFamilyInvites(supabase, familyId) {
  return supabase
    .from("family_invites")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
}

export function createFamilyInvite(supabase, invite) {
  return supabase.from("family_invites").insert(invite).select().single();
}

export function deleteFamilyInvite(supabase, id) {
  return supabase.from("family_invites").delete().eq("id", id);
}

export function updateFamilyMemberRole(supabase, id, role) {
  return supabase.from("family_members").update({ role }).eq("id", id).select().single();
}

export function removeFamilyMember(supabase, id) {
  return supabase.from("family_members").delete().eq("id", id);
}

export function acceptFamilyInvite(supabase, inviteToken) {
  return supabase.rpc("accept_family_invite", { target_invite_token: inviteToken });
}

export function lookupFamilyInvite(supabase, inviteToken) {
  return supabase.rpc("lookup_family_invite", { target_invite_token: inviteToken });
}
