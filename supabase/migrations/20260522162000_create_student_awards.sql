create table if not exists public.student_awards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  category text,
  issuing_org text,
  date_earned date,
  description text,
  scholarship_angle text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_awards_family_id_idx
  on public.student_awards(family_id);

create index if not exists student_awards_student_id_idx
  on public.student_awards(student_id);

alter table public.student_awards enable row level security;

drop policy if exists "student_awards_family_select" on public.student_awards;
create policy "student_awards_family_select"
  on public.student_awards
  for select
  using (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = student_awards.family_id
        and fm.user_id = auth.uid()
    )
  );

drop policy if exists "student_awards_family_insert" on public.student_awards;
create policy "student_awards_family_insert"
  on public.student_awards
  for insert
  with check (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = student_awards.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('family_admin', 'parent', 'student')
    )
  );

drop policy if exists "student_awards_family_update" on public.student_awards;
create policy "student_awards_family_update"
  on public.student_awards
  for update
  using (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = student_awards.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('family_admin', 'parent', 'student')
    )
  )
  with check (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = student_awards.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('family_admin', 'parent', 'student')
    )
  );

drop policy if exists "student_awards_family_delete" on public.student_awards;
create policy "student_awards_family_delete"
  on public.student_awards
  for delete
  using (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = student_awards.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('family_admin', 'parent')
    )
  );
