ALTER TABLE IF EXISTS public.user_settings
  ADD COLUMN IF NOT EXISTS manual_review_keywords JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.user_settings
SET manual_review_keywords = '[]'::jsonb
WHERE manual_review_keywords IS NULL;
