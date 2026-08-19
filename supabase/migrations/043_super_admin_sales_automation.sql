-- 1. Add super_admin to account_role_enum if not exists
ALTER TYPE account_role_enum ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Promote mohamed701164@gmail.com to super_admin
UPDATE profiles
SET account_role = 'super_admin'
WHERE email = 'mohamed701164@gmail.com';

-- 3. Backfill subscriptions for existing buyer accounts if missing
INSERT INTO subscriptions (account_id, plan, status, current_period_end)
SELECT id, 'monthly', 'active', NOW() + INTERVAL '30 days'
FROM accounts
WHERE id IN ('506d399b-b9fb-454c-8784-e7a12a572326', 'c41c7cba-a311-4afd-95ff-724191b1468c')
ON CONFLICT (account_id) DO NOTHING;

-- 4. Backfill buyer contacts and deals under Super Admin account (030a0ca4-2b5c-40d7-9d77-bb61b379b81a)
DO $$
DECLARE
  v_super_admin_account UUID := '030a0ca4-2b5c-40d7-9d77-bb61b379b81a';
  v_super_admin_user UUID := '775648fb-7972-4b77-9954-de06eaf9efa3';
  v_pipeline UUID := '6646d51b-eafd-47f5-938a-2f9c0ae1509b';
  v_stage_won UUID := '32e36076-be1c-42c6-94d1-5208c35744d6';
  v_c1 UUID;
  v_c2 UUID;
BEGIN
  -- Contact for portalchip81
  INSERT INTO contacts (account_id, user_id, phone, name, email, company)
  VALUES (v_super_admin_account, v_super_admin_user, '+201000000001', 'شركة portalchip81', 'portalchip81@gmail.com', 'شركة portalchip81')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_c1;

  IF v_c1 IS NOT NULL THEN
    INSERT INTO deals (account_id, user_id, pipeline_id, stage_id, contact_id, title, value, currency, status)
    VALUES (v_super_admin_account, v_super_admin_user, v_pipeline, v_stage_won, v_c1, 'اشتراك منصة - شركة portalchip81', 1000.00, 'EGP', 'won')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Contact for zagazig5872
  INSERT INTO contacts (account_id, user_id, phone, name, email, company)
  VALUES (v_super_admin_account, v_super_admin_user, '+201000000002', 'شركة zagazig5872', 'zagazig5872@gmail.com', 'شركة zagazig5872')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_c2;

  IF v_c2 IS NOT NULL THEN
    INSERT INTO deals (account_id, user_id, pipeline_id, stage_id, contact_id, title, value, currency, status)
    VALUES (v_super_admin_account, v_super_admin_user, v_pipeline, v_stage_won, v_c2, 'اشتراك منصة - zagazig5872', 1000.00, 'EGP', 'won')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 5. Update redeem_tenant_invitation RPC for future buyer registrations
CREATE OR REPLACE FUNCTION redeem_tenant_invitation(
  p_token_hash TEXT,
  p_company_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_inv RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_account_id UUID;
  v_period_end TIMESTAMPTZ;
  v_super_admin_account_id UUID := '030a0ca4-2b5c-40d7-9d77-bb61b379b81a';
  v_super_admin_user_id UUID := '775648fb-7972-4b77-9954-de06eaf9efa3';
  v_pipeline_id UUID := '6646d51b-eafd-47f5-938a-2f9c0ae1509b';
  v_stage_won_id UUID := '32e36076-be1c-42c6-94d1-5208c35744d6';
  v_contact_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Fetch user email and name
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles
  WHERE user_id = v_user_id;

  SELECT * INTO v_inv
  FROM system_invitations
  WHERE token_hash = p_token_hash
    AND used_at IS NULL
    AND expires_at > NOW();

  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Invalid, used, or expired invitation token' USING ERRCODE = '22023';
  END IF;

  -- Create new buyer account
  INSERT INTO accounts (name, owner_user_id)
  VALUES (COALESCE(NULLIF(TRIM(p_company_name), ''), v_inv.company_name, 'New Company'), v_user_id)
  RETURNING id INTO v_account_id;

  -- Update buyer user profile
  UPDATE profiles
  SET account_id = v_account_id,
      account_role = 'owner'
  WHERE user_id = v_user_id;

  -- Create subscription record with duration_days
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

  -- AUTOMATION: Register buyer as a Contact in Super Admin's CRM Account
  INSERT INTO contacts (account_id, user_id, phone, name, email, company)
  VALUES (
    v_super_admin_account_id,
    v_super_admin_user_id,
    '+201' || FLOOR(RANDOM() * 899999999 + 100000000)::TEXT,
    COALESCE(v_user_name, p_company_name, 'مشتري منصة جديد'),
    COALESCE(v_user_email, 'newbuyer@wacrm.com'),
    COALESCE(p_company_name, 'شركة جديدة')
  )
  RETURNING id INTO v_contact_id;

  -- AUTOMATION: Create a Deal/Sales Lead in Super Admin's CRM Pipeline (Kanban)
  INSERT INTO deals (account_id, user_id, pipeline_id, stage_id, contact_id, title, value, currency, status)
  VALUES (
    v_super_admin_account_id,
    v_super_admin_user_id,
    v_pipeline_id,
    v_stage_won_id,
    v_contact_id,
    'اشتراك منصة - ' || COALESCE(p_company_name, v_user_email, 'شركة جديدة'),
    1000.00,
    'EGP',
    'won'
  );

  RETURN jsonb_build_object(
    'account_id', v_account_id,
    'expires_at', v_period_end
  );
END;
$func$;
