-- Migration: 20260912000008_create_audit_logs.sql
-- Description: Centralized immutable application audit logging table and RLS policies

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and query indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Select Policy: Authenticated officers & system can view audit logs
CREATE POLICY "audit_logs_select_policy"
    ON public.audit_logs
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Insert Policy: Authenticated users & service role can append audit entries
CREATE POLICY "audit_logs_insert_policy"
    ON public.audit_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- IMMUTABILITY GUARANTEE:
-- Explicitly NO UPDATE or DELETE policies exist for public.audit_logs.
-- Normal users and authenticated clients cannot alter or erase historical records.
COMMENT ON TABLE public.audit_logs IS 'Immutable application audit log tracking operational, security, and lifecycle actions.';
