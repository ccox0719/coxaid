# Family Scholarship Application Workspace

Supabase-powered React app for managing scholarship applications for Jaden, Kyden, and Elsie. The main workflow is a searchable reusable answer bank: students can save strong scholarship answers, search them later by tags/topic/scholarship/keyword, open a copy box, copy the answer, and duplicate it for a new scholarship.

## Included

- Supabase Auth login.
- Parent/admin access to all students.
- Student access limited to their own workspace by Row Level Security.
- Student records for Jaden, Kyden, and Elsie.
- Scholarship tracker with deadlines, priority, statuses, eligibility notes, assigned students, and document checklist flags.
- Application workspaces with questions, draft answers, final answers, tags, categories, and submission notes.
- Finalized workspace answers can be saved directly to the reusable answer bank.
- Answer bank search by keyword, tag, category, scholarship name, year, word count range, and quality rating.
- Copy box with answer text, copy button, word count, character count, and placeholders for future shorten/expand features.
- Tasks, upcoming deadlines, deadline calendar, dashboard metrics, most-used tags, overdue tasks.
- Common student profile info pages.
- Answer bank CSV export.
- Scholarship CSV import through the UI or CLI script.
- Supabase SQL schema and RLS policies in `supabase/schema.sql`.

Sensitive document uploads are intentionally not implemented. The app tracks document requirements as checklist fields only.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project.

3. Run the schema:

   Open the Supabase SQL editor, paste `supabase/schema.sql`, and run it.

4. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

5. Create Supabase Auth users:

   - One parent/admin login.
   - Optional student logins for Jaden, Kyden, and Elsie.

6. Link Auth users to profiles.

   The schema seeds the `students` rows. Auth user IDs are project-specific, so create profile rows after making Auth users:

   ```sql
   insert into public.profiles (user_id, name, role)
   values ('PARENT_AUTH_USER_ID', 'Parent', 'parent')
   on conflict (user_id) do update set name = excluded.name, role = excluded.role;

   insert into public.profiles (user_id, name, role, student_id)
   select 'JADEN_AUTH_USER_ID', 'Jaden', 'student', id from public.students where name = 'Jaden'
   on conflict (user_id) do update set name = excluded.name, role = excluded.role, student_id = excluded.student_id;

   insert into public.profiles (user_id, name, role, student_id)
   select 'KYDEN_AUTH_USER_ID', 'Kyden', 'student', id from public.students where name = 'Kyden'
   on conflict (user_id) do update set name = excluded.name, role = excluded.role, student_id = excluded.student_id;

   insert into public.profiles (user_id, name, role, student_id)
   select 'ELSIE_AUTH_USER_ID', 'Elsie', 'student', id from public.students where name = 'Elsie'
   on conflict (user_id) do update set name = excluded.name, role = excluded.role, student_id = excluded.student_id;
   ```

7. Import the cleaned scholarship CSV:

   ```bash
   npm run import:scholarships
   ```

   The default source is `clean_military_dependent_scholarships.csv`. To import another file:

   ```bash
   npm run import:scholarships -- ./path/to/scholarships.csv
   ```

8. Run the app:

   ```bash
   npm run dev
   ```

## CSV Format

Scholarship import expects:

```csv
name,link,award,deadline,status,source_file,last_verified_at,eligibility_reason,age_min,age_max,grade_requirement,eligible_now,eligible_soon,priority_score,notes
```

## Main Tables

- `profiles`: Auth-linked users and role.
- `students`: Jaden, Kyden, Elsie plus profile info like GPA, activities, awards, career interests, and military family background.
- `scholarships`: General scholarship library all authenticated users can read.
- `student_scholarships`: Per-student tracker and document checklist.
- `application_workspaces`: One workspace per student and scholarship.
- `application_questions`: Questions, drafts, final answers, tags, categories, limits, and completion state.
- `answer_bank`: Reusable answer database.
- `answer_versions`: Simple version history table for saved answer text.
- `tasks`: Student, scholarship, and workspace tasks.

## RLS Summary

- Parent/admin can view and edit everything.
- Student users can view and edit only rows tied to their `student_id`.
- All authenticated users can read the general scholarship list.
- Application questions inherit permissions from their workspace.
- Answer versions inherit permissions from their answer bank row.

## Verification

```bash
npm run build
```

## Build and deploy (this repository)

The source lives in `app/`. Netlify serves the repository root with no build command, so
production output is committed to the root:

```bash
cd app
npm ci
set -a; . ./.env.local; set +a   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (never committed)
npm run build                    # writes ../index.html and ../assets/
npm test                         # status-model unit tests
```

The earlier `assets/student-experience.js/.css` DOM-patching layer was removed: its
behavior (Home first, grade-aware lists, task context) now lives in the source, and the
layer targeted markup that no longer exists. See `tests/e2e/README.md` for mocked UI checks.
