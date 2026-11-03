-- Self-serve onboarding: lets a signed-in user with no family create one
-- family, become its family_admin, and add a first student.
--
-- Additive: one new function, no new tables, no policy changes, no data rewritten.
-- Runs as security definer because a brand-new user cannot satisfy the
-- family_members / students insert policies yet. All checks are inside.
-- Rollback: supabase/rollbacks/20261103150000_create_family_onboarding_down.sql

create or replace function public.create_family_with_student(
  family_name text,
  student_name text,
  student_grade text default null
)
returns uuid
language plpgsql
security definer
set row_security = off
set search_path = public
as $$
declare
  new_family_id uuid;
  clean_family text := btrim(coalesce(family_name, ''));
  clean_student text := btrim(coalesce(student_name, ''));
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(clean_family) not between 1 and 80 or char_length(clean_student) not between 1 and 80 then
    raise exception 'Family and student names must be 1 to 80 characters.';
  end if;

  -- Onboarding only: anyone already in a family must use invites / Settings.
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'This account already belongs to a family.';
  end if;

  insert into public.families (name) values (clean_family) returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, auth.uid(), 'family_admin');

  insert into public.students (family_id, name, grade_level)
  values (new_family_id, clean_student, nullif(btrim(coalesce(student_grade, '')), ''));

  return new_family_id;
end;
$$;

revoke all on function public.create_family_with_student(text, text, text) from public, anon;
grant execute on function public.create_family_with_student(text, text, text) to authenticated;
