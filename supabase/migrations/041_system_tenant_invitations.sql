-- Migration 041: System Tenant Invitations for Super-Admin Onboarding
CREATE TABLE IF NOT EXISTS system_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  company_name TEXT,
  plan_type TEXT DEFAULT 'monthly',
  duration_days INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE system_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to system_invitations"
  ON system_invitations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC for redeeming a tenant creation invitation
CREATE OR REPLACE FUNCTION redeem_tenant_invitation(
  p_token_hash TEXT,
  p_company_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv RECORD;
  v_user_id UUID;
  v_account_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv
  FROM system_invitations
  WHERE token_hash = p_token_hash
    AND used_at IS NULL
    AND expires_at > NOW();

  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Invalid, used, or expired invitation token' USING ERRCODE = '22023';
  END IF;

  -- Create new account
  INSERT INTO accounts (name)
  VALUES (COALESCE(NULLIF(TRIM(p_company_name), ''), v_inv.company_name, 'New Company'))
  RETURNING id INTO v_account_id;

  -- Assign user as Owner of new account
  INSERT INTO account_members (account_id, user_id, role)
  VALUES (v_account_id, v_user_id, 'owner')
  ON CONFLICT (account_id, user_id) DO UPDATE SET role = 'owner';

  -- Create subscription with duration_days
  v_period_end := NOW() + (v_inv.duration_days || ' days')::INTERVAL;
  INSERT INTO subscriptions (account_id, plan, status, current_period_end)
  VALUES (v_account_id, v_inv.plan_type, 'active', v_period_end)
  ON CONFLICT (account_id) DO UPDATE
    SET plan = v_inv.plan_type,
        status = 'active',
        current_period_end = v_period_end;

  -- Mark invitation as used
  UPDATE system_invitations
  SET used_at = NOW(),
      used_by_user_id = v_user_id
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'account_id', v_account_id,
    'expires_at', v_period_end
  );
END;
$$;
