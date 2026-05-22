-- Migration: Create tables for syncing chores and ledger data across devices
-- Run this in your Supabase SQL Editor

-- ============================================
-- CHORE RATE OVERRIDES
-- ============================================
CREATE TABLE IF NOT EXISTS chore_rate_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    rate_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, task_name)
);
CREATE INDEX IF NOT EXISTS idx_chore_rate_overrides_household ON chore_rate_overrides(household_id);
ALTER TABLE chore_rate_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household rate overrides"
ON chore_rate_overrides FOR ALL
USING (household_id IS NOT NULL);
-- ============================================
-- CUSTOM LEDGER ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS ledger_custom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id VARCHAR(255) NOT NULL,
    entry_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    child VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    description TEXT,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    target VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, entry_id)
);
CREATE INDEX IF NOT EXISTS idx_ledger_custom_household ON ledger_custom(household_id);
ALTER TABLE ledger_custom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household custom ledger"
ON ledger_custom FOR ALL
USING (household_id IS NOT NULL);
-- ============================================
-- LEDGER TRANSFER STATUS
-- ============================================
CREATE TABLE IF NOT EXISTS ledger_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id VARCHAR(255) NOT NULL,
    year VARCHAR(4) NOT NULL,
    tithe_done BOOLEAN NOT NULL DEFAULT false,
    tithe_date DATE,
    savings_done BOOLEAN NOT NULL DEFAULT false,
    savings_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, year)
);
CREATE INDEX IF NOT EXISTS idx_ledger_transfer_household ON ledger_transfer(household_id);
ALTER TABLE ledger_transfer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household transfer status"
ON ledger_transfer FOR ALL
USING (household_id IS NOT NULL);
-- ============================================
-- LEDGER ENTRY EDITS
-- ============================================
CREATE TABLE IF NOT EXISTS ledger_entry_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id VARCHAR(255) NOT NULL,
    entry_id VARCHAR(255) NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT false,
    overrides JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, entry_id)
);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_edits_household ON ledger_entry_edits(household_id);
ALTER TABLE ledger_entry_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household entry edits"
ON ledger_entry_edits FOR ALL
USING (household_id IS NOT NULL);
