export function listEmailTemplates(supabase) {
  return supabase
    .from("email_templates")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("name");
}

export function saveEmailTemplate(supabase, template) {
  if (template.id) {
    return supabase
      .from("email_templates")
      .update(template)
      .eq("id", template.id)
      .select()
      .single();
  }

  return supabase
    .from("email_templates")
    .insert(template)
    .select()
    .single();
}

export function archiveEmailTemplate(supabase, id) {
  return supabase
    .from("email_templates")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();
}

export function listGeneratedEmails(supabase, familyId) {
  return supabase
    .from("generated_emails")
    .select("*, student:students(*), scholarship:scholarships(*), lead:local_scholarship_leads(*), template:email_templates(*)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
}

export function saveGeneratedEmail(supabase, email) {
  return supabase.from("generated_emails").insert(email).select().single();
}

export function markEmailCopied(supabase, id) {
  return supabase
    .from("generated_emails")
    .update({ copied_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

export function markEmailSent(supabase, id) {
  return supabase
    .from("generated_emails")
    .update({ sent_manually: true })
    .eq("id", id)
    .select()
    .single();
}

export function deleteGeneratedEmail(supabase, id) {
  return supabase.from("generated_emails").delete().eq("id", id);
}
