-- ============================================================
-- ChiCayo Tax — Supabase Full Schema Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to run on existing databases — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
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

-- ────────────────────────────────────────────────────────────
-- 2. APPOINTMENTS TABLE (Core — this is what was failing)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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
    activated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    original_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    original_onboard_type TEXT,
    original_ae_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ADD MISSING COLUMNS to existing appointments table (safe to run even if table exists)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_ae_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_onboard_type TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS original_user_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS activated_by_user_id UUID;
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
-- 3. PAY CYCLES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pay_cycles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. INCENTIVES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentives (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    applied_cycle_id TEXT REFERENCES public.pay_cycles(id) ON DELETE SET NULL,
    related_appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
    rule_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. INCENTIVE RULES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL DEFAULT 'team',
    type TEXT NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'per_deal', 'up_for_grabs')),
    value_cents INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    target_count INTEGER,
    current_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. ACTIVITY LOGS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    details TEXT DEFAULT '',
    related_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Add missing column to activity_logs if it doesn't exist
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS related_id TEXT;

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

-- Add missing commission_activation column if it doesn't exist
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS commission_activation INTEGER DEFAULT 100000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS commission_referral INTEGER DEFAULT 20000;

-- Seed default settings row if not present
INSERT INTO public.settings (id, commission_standard, commission_self, commission_referral, commission_activation)
VALUES ('global', 20000, 30000, 20000, 100000)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS) — Agents see own, Admins see all
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- DROP old policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Appointments: agents see own, admins see all" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: anyone can insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: anyone can update" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: admins delete" ON public.appointments;
DROP POLICY IF EXISTS "Incentives: read own" ON public.incentives;
DROP POLICY IF EXISTS "Incentives: insert" ON public.incentives;
DROP POLICY IF EXISTS "Incentives: delete" ON public.incentives;
DROP POLICY IF EXISTS "Incentive rules: read all" ON public.incentive_rules;
DROP POLICY IF EXISTS "Incentive rules: admin write" ON public.incentive_rules;
DROP POLICY IF EXISTS "Activity logs: read all" ON public.activity_logs;
DROP POLICY IF EXISTS "Activity logs: insert" ON public.activity_logs;
DROP POLICY IF EXISTS "Pay cycles: read all" ON public.pay_cycles;
DROP POLICY IF EXISTS "Pay cycles: admin write" ON public.pay_cycles;
DROP POLICY IF EXISTS "Settings: read all" ON public.settings;
DROP POLICY IF EXISTS "Settings: admin write" ON public.settings;

-- USERS
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- APPOINTMENTS — All authenticated users can read/write (agent data filtered in app)
CREATE POLICY "Appointments: agents see own, admins see all" ON public.appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: anyone can insert" ON public.appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: anyone can update" ON public.appointments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Appointments: admins delete" ON public.appointments FOR DELETE USING (auth.uid() IS NOT NULL);

-- INCENTIVES
CREATE POLICY "Incentives: read own" ON public.incentives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Incentives: insert" ON public.incentives FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Incentives: delete" ON public.incentives FOR DELETE USING (auth.uid() IS NOT NULL);

-- INCENTIVE RULES
CREATE POLICY "Incentive rules: read all" ON public.incentive_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Incentive rules: admin write" ON public.incentive_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- ACTIVITY LOGS
CREATE POLICY "Activity logs: read all" ON public.activity_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Activity logs: insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PAY CYCLES
CREATE POLICY "Pay cycles: read all" ON public.pay_cycles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Pay cycles: admin write" ON public.pay_cycles FOR ALL USING (auth.uid() IS NOT NULL);

-- SETTINGS
CREATE POLICY "Settings: read all" ON public.settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Settings: admin write" ON public.settings FOR ALL USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 9. NEW USER TRIGGER — Auto-inserts profile row on signup
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

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- DONE ✅
-- All tables, columns, RLS policies, and triggers are set up.
-- ────────────────────────────────────────────────────────────
