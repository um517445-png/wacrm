-- Migration 042: Remediate buyer tenant isolation for portalchip81@gmail.com
-- Created an independent account for portalchip81@gmail.com and set account_role = 'owner'

DO $$
DECLARE
  v_user_id UUID := '94784792-cb1d-43c8-8271-ff31282e3ade';
  v_account_id UUID;
BEGIN
  -- Create independent account if not exists
  SELECT id INTO v_account_id
  FROM accounts
  WHERE owner_user_id = v_user_id;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (name, owner_user_id, default_currency, branding_name)
    VALUES ('شركة portalchip81', v_user_id, 'USD', 'Vorder')
    RETURNING id INTO v_account_id;
  END IF;

  -- Update profile to point to independent account as owner
  UPDATE profiles
  SET account_id = v_account_id,
      account_role = 'owner'
  WHERE user_id = v_user_id;
END $$;
