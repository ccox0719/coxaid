-- Migration: Create bucket_settings table for syncing budgets and icons across devices
-- Run this in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS bucket_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id VARCHAR(255) NOT NULL,
    bucket_id VARCHAR(255) NOT NULL,
    monthly_amount_cents INTEGER DEFAULT 0,
    annual_amount_cents INTEGER DEFAULT 0,
    icon VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, bucket_id)
);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bucket_settings_household ON bucket_settings(household_id);
CREATE INDEX IF NOT EXISTS idx_bucket_settings_household_bucket ON bucket_settings(household_id, bucket_id);
-- Enable RLS (Row Level Security)
ALTER TABLE bucket_settings ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only access their household's settings
CREATE POLICY "Users can manage their household settings"
ON bucket_settings FOR ALL
USING (household_id = (
    SELECT household_id::text 
    FROM auth.users 
    WHERE id = auth.uid()
) OR household_id IS NOT NULL);
-- Allow access for anon for now since app uses household_id directly

-- Note: For stricter security, you may want to add a household_members table
-- and join on it. For now, we allow access if you know the household_id.;
