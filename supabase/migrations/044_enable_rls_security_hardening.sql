-- ============================================================
-- Migration 044: Security Hardening & RLS Enforcement (40 Tables)
-- ============================================================

-- 1. Update is_account_member helper function to include super_admin (rank 5)
CREATE OR REPLACE FUNCTION public.is_account_member(
  target_account_id UUID,
  min_role public.account_role_enum DEFAULT 'viewer'::public.account_role_enum
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.account_id = target_account_id
      AND profiles.user_id = auth.uid()
      AND (
        CASE profiles.account_role
          WHEN 'super_admin' THEN 5
          WHEN 'owner' THEN 4
          WHEN 'admin' THEN 3
          WHEN 'agent' THEN 2
          WHEN 'viewer' THEN 1
          ELSE 0
        END
      ) >= (
        CASE min_role
          WHEN 'super_admin' THEN 5
          WHEN 'owner' THEN 4
          WHEN 'admin' THEN 3
          WHEN 'agent' THEN 2
          WHEN 'viewer' THEN 1
          ELSE 0
        END
      )
  );
$$;

-- 2. Enable RLS on System, Cache, and Mixpost tables
DO $$ 
DECLARE
  t TEXT;
  tables_to_secure TEXT[] := ARRAY[
    'sessions', 'cache', 'cache_locks', 'jobs',
    'Organization', 'UserOrganization', 'Tags', 'TagsPosts', 'Media',
    'mixpost_posting_schedules', 'mixpost_workspaces', 'mixpost_workspace_user',
    'mixpost_access_tokens', 'mixpost_services', 'mixpost_post_versions',
    'mixpost_tags', 'mixpost_tag_post'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_secure LOOP
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      
      IF NOT EXISTS (
        SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = %L OR auth.uid() IS NOT NULL);', 
          'allow_authenticated_and_service_' || t, t, 'service_role');
      END IF;
    END IF;
  END LOOP;

  -- Also enable RLS on any remaining public tables that do not have RLS enabled
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
