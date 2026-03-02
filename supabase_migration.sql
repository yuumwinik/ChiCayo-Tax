-- ============================================================
-- ChiCayo Tax — Supabase Full Schema Migration (v2 - Fixed)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to run on existing databases — uses IF NOT EXISTS
-- NO foreign key type conflicts — all cross-table IDs are TEXT
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'admin')),
    avatar_id TEXT DEFAULT 'initial',
    has_seen_tutorial BOOLEAN DEFAULT false,
    notification_settings JSONB DEFAULT '{"enabled": true, "thresholdMinutes": 20}'::jsonb,
    preferred_dialer TEXT,
    dismissed_cycle_ids TEXT[] DEFAULT '{}',
    show_failed_section BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add any missing columns to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_id TEXT DEFAULT 'initial';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"enabled": true, "thresholdMinutes": 20}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_dialer TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dismissed_cycle_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_failed_section BOOLEAN DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 2. PAY CYCLES TABLE
-- NOTE: id is TEXT to match app-generated IDs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pay_cycles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pay_cycles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';

-- ────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS TABLE
-- NOTE: All cross-table IDs stored as TEXT (no UUID FK constraints)
-- This avoids the type mismatch error entirely
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT,                      -- stored as text to avoid UUID FK issues
    name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    scheduled_at TIMESTAMPTZ,
    stage TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT DEFAULT '',
    type TEXT DEFAULT 'appointment',
    ae_name TEXT,
    earned_amount INTEGER DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    referral_history JSONB DEFAULT '[]'::jsonb,
    last_referral_at TIMESTAMPTZ,
    nurture_date TIMESTAMPTZ,
    onboarded_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    activated_by_user_id TEXT,
    original_user_id TEXT,
    original_onboard_type TEXT,
    original_ae_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ADD MISSING COLUMNS to existing appointments table (the core fix)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_ae_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_onboard_type TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_user_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS activated_by_user_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS nurture_date TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS last_referral_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS referral_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS earned_amount INTEGER DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ae_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'appointment';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ────────────────────────────────────────────────────────────
-- 4. INCENTIVES TABLE
-- NOTE: applied_cycle_id and related_appointment_id are TEXT (no UUID FK)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentives (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    applied_cycle_id TEXT,              -- TEXT to match pay_cycles.id (TEXT)
    related_appointment_id TEXT,        -- TEXT to match appointments.id (TEXT)
    rule_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incentives ADD COLUMN IF NOT EXISTS rule_id TEXT;
ALTER TABLE public.incentives ADD COLUMN IF NOT EXISTS related_appointment_id TEXT;
ALTER TABLE public.incentives ADD COLUMN IF NOT EXISTS applied_cycle_id TEXT;

-- ────────────────────────────────────────────────────────────
-- 5. INCENTIVE RULES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL DEFAULT 'team',
    type TEXT NOT NULL DEFAULT 'one_time',
    value_cents INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    target_count INTEGER,
    current_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incentive_rules ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0;
ALTER TABLE public.incentive_rules ADD COLUMN IF NOT EXISTS target_count INTEGER;
ALTER TABLE public.incentive_rules ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.incentive_rules ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.incentive_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ────────────────────────────────────────────────────────────
-- 6. ACTIVITY LOGS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    user_name TEXT DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    details TEXT DEFAULT '',
    related_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';

-- ────────────────────────────────────────────────────────────
-- 7. GLOBAL SETTINGS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    commission_standard INTEGER DEFAULT 20000,
    commission_self INTEGER DEFAULT 30000,
    commission_referral INTEGER DEFAULT 20000,
    commission_activation INTEGER DEFAULT 100000,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS commission_activation INTEGER DEFAULT 100000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS commission_referral INTEGER DEFAULT 20000;

-- Seed default settings row if not already present
INSERT INTO public.settings (id, commission_standard, commission_self, commission_referral, commission_activation)
VALUES ('global', 20000, 30000, 20000, 100000)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies first to avoid conflicts on re-run
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Appointments: read all" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: update" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: delete" ON public.appointments;
DROP POLICY IF EXISTS "Incentives: read" ON public.incentives;
DROP POLICY IF EXISTS "Incentives: insert" ON public.incentives;
DROP POLICY IF EXISTS "Incentives: delete" ON public.incentives;
DROP POLICY IF EXISTS "Incentive rules: read all" ON public.incentive_rules;
DROP POLICY IF EXISTS "Incentive rules: write" ON public.incentive_rules;
DROP POLICY IF EXISTS "Activity logs: read all" ON public.activity_logs;
DROP POLICY IF EXISTS "Activity logs: insert" ON public.activity_logs;
DROP POLICY IF EXISTS "Pay cycles: read all" ON public.pay_cycles;
DROP POLICY IF EXISTS "Pay cycles: write" ON public.pay_cycles;
DROP POLICY IF EXISTS "Settings: read all" ON public.settings;
DROP POLICY IF EXISTS "Settings: write" ON public.settings;

-- USERS policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- APPOINTMENTS policies (all authenticated users can fully manage)
CREATE POLICY "Appointments: read all" ON public.appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: insert" ON public.appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: update" ON public.appointments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: delete" ON public.appointments FOR DELETE USING (auth.uid() IS NOT NULL);

-- INCENTIVES policies
CREATE POLICY "Incentives: read" ON public.incentives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Incentives: insert" ON public.incentives FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Incentives: delete" ON public.incentives FOR DELETE USING (auth.uid() IS NOT NULL);

-- INCENTIVE RULES policies
CREATE POLICY "Incentive rules: read all" ON public.incentive_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Incentive rules: write" ON public.incentive_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- ACTIVITY LOGS policies
CREATE POLICY "Activity logs: read all" ON public.activity_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Activity logs: insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PAY CYCLES policies
CREATE POLICY "Pay cycles: read all" ON public.pay_cycles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Pay cycles: write" ON public.pay_cycles FOR ALL USING (auth.uid() IS NOT NULL);

-- SETTINGS policies
CREATE POLICY "Settings: read all" ON public.settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Settings: write" ON public.settings FOR ALL USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 9. AUTO-CREATE USER PROFILE ON SIGNUP TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, avatar_id, has_seen_tutorial, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'agent',
        'initial',
        false,
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- DONE ✅
-- All tables, columns, RLS policies, and triggers are ready.
-- ────────────────────────────────────────────────────────────
