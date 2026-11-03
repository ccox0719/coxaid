drop function if exists public.create_family_with_student(text, text, text);
-- Families created through this function are ordinary rows; remove them only
-- deliberately (families cascade to members, students and all their data).
