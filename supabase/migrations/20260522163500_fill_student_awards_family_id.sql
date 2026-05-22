create or replace function public.set_student_award_family_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.family_id is null then
    select s.family_id
      into new.family_id
      from public.students s
      where s.id = new.student_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_student_award_family_id_before_insert
  on public.student_awards;

create trigger set_student_award_family_id_before_insert
  before insert on public.student_awards
  for each row
  execute function public.set_student_award_family_id();
