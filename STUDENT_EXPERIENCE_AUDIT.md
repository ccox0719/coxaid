# Student experience audit and implementation notes

## Phase 1 — Audit

This checkout is a deployed static build, not the application source repository. It contains a compiled React bundle, a compiled CSS bundle, static PWA assets, and a partial Supabase migration history. There is no `package.json`, source component tree, test configuration, generated database types, or complete baseline schema.

The app uses React, Lucide icons, a custom responsive CSS system, and Supabase authentication/data APIs. The current student workspace is state-driven rather than URL-routed.

- Navigation before this change: Dashboard, Scholarships, Applications, Tasks, Service Log, Local Leads, Answer Bank, Follow-Up Emails, Student Profiles, Awards, Scholarship Report, and Family Settings. Mobile promoted Home, Scholarships, Applications, and Tasks, with the remainder in More.
- Dashboard before this change: an inspiration-led hero, four metrics, active applications, deadlines, and a generated document checklist. Tasks and deadlines existed, but “what next?” was not the first message.
- Scholarship model observed in the bundle: name/link/award, normalized and raw deadlines, school relationships, tags, grade requirement, state/age eligibility, eligibility reason, current/soon eligibility flags, priority, verification date, status, source file, application requirements, and value/renewal fields.
- Task model observed in the bundle: student, scholarship/workspace relationships, title, notes, type, due date, required/completed flags. There was no dependable completion-time or urgency field in the checked-in schema.
- Answer Bank already supports saved answers, search/filter controls, topics/categories/tags, copy/duplicate/edit/delete actions, reusable snippets, word counts, and update timestamps from Supabase.
- Existing loading, empty, error, and authentication states are retained.

Primary confusion points were the crowded global navigation, Answer Bank being buried on mobile, Applications taking a primary slot ahead of Answer Bank, an inspiration-first Home hero, task cards hiding descriptions and lacking time estimates, and a scholarship list whose grade-aware filtering was not explained visibly.

## Assumptions

- The existing `students.grade_level`, `scholarships.grade_requirement`, eligibility helper, Supabase auth, and row-level access behavior remain authoritative.
- Existing scholarship and task rows must not be backfilled with guessed values.
- Because only compiled artifacts are available, the UI work is isolated in `assets/student-experience.js` and `assets/student-experience.css`. The layer enhances the rendered application without changing data-fetching, authentication, or mutation behavior.
- Time estimates shown for legacy rows are clearly approximate heuristics based on task/application type. New database fields allow explicit values to replace those estimates.

## Phase 2 — Implementation plan

- Load a focused student-experience enhancement and style layer from `index.html`.
- Make the persistent mobile order exactly Home, Tasks, Scholarships, Answer Bank, More; move Applications into More and keep secondary tools there.
- Reframe Home around the next deadline/task and add compact quick access.
- Surface task descriptions, estimated time, status, and deadline state; clarify task groups.
- Explain grade/profile prioritization on Scholarships and add scannable match/time/status facts.
- Add concise Answer Bank guidance while preserving its full editing/search/reuse flow.
- Add an additive Supabase migration for grade arrays, source/cycle/status verification, explicit time estimates, and an append-only verification audit.

## Phase 4 — Scholarship data review

No scholarship rows or authenticated database export are present in this checkout, so record-level duplicate, deadline, eligibility, and broken-link verification could not be performed responsibly. No production scholarship data was overwritten and no web sources were guessed.

After applying the migration, a human reviewer should export or review records where any of these are true:

- deadline and deadline raw text are both missing;
- deadline is in the past while status is active;
- grade requirement and eligible grade levels are both missing;
- source URL is missing or does not resolve;
- last verified date is missing or older than the organization’s chosen review interval;
- normalized name plus sponsor indicates a likely duplicate;
- application cycle is missing or scholarship status is `needs_verification`.

Verification updates should include the official sponsor/application URL. The database trigger records previous and new verification values in `scholarship_verification_audit`.

## Phase 5 — Validation checklist

- Confirm navigation order and active state at common phone widths and in standalone PWA mode.
- Confirm Answer Bank navigation and Applications-in-More behavior for every existing role.
- Test zero, one, and many tasks; no-date, overdue, upcoming, and completed tasks.
- Test scholarship views for every supported grade level, “show all,” saved/not-eligible records, missing deadlines, and missing grades.
- Confirm explicit `estimated_completion_minutes` values replace UI heuristics when this enhancement is ported into the React source.
- Exercise loading, empty, timeout/error, signed-out, and missing-environment states.
- Run keyboard-only navigation and a screen-reader pass; verify visible focus, labels, heading order, touch targets, contrast, and reduced motion.
- Run the source repository’s unit, integration, type, and end-to-end suites when that repository is available.

