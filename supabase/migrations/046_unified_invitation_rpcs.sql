-- ============================================================
-- 046_unified_invitation_rpcs.sql — Unified Peek & Redeem RPCs
--
-- Unifies account_invitations (team member invites) and
-- system_invitations (tenant/company setup invites) so that
-- /join/<token> works seamlessly for both invitation types.
-- ============================================================

CREATE OR REPLACE FUNCTION public.peek_invitation(
  p_token_hash TEXT
) RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv account_invitations%ROWTYPE;
  v_sys_inv system_invitations%ROWTYPE;
  v_account_name TEXT;
BEGIN
  -- 1. Try matching account_invitations (team members)
  SELECT * INTO v_inv
  FROM account_invitations
  WHERE token_hash = p_token_hash;

  IF FOUND THEN
    IF v_inv.accepted_at IS NOT NULL THEN
      RETURN json_build_object('ok', false, 'reason', 'used');
    END IF;

    IF v_inv.expires_at <= NOW() THEN
      RETURN json_build_object('ok', false, 'reason', 'expired');
    END IF;

    SELECT name INTO v_account_name
    FROM accounts
    WHERE id = v_inv.account_id;

    RETURN json_build_object(
      'ok', true,
      'account_name', v_account_name,
      'role', v_inv.role,
      'expires_at', v_inv.expires_at,
      'is_system_invite', false
    );
  END IF;

  -- 2. Try matching system_invitations (tenant/company setup invites)
  SELECT * INTO v_sys_inv
  FROM system_invitations
  WHERE token_hash = p_token_hash OR raw_token = p_token_hash;

  IF FOUND THEN
    IF v_sys_inv.used_at IS NOT NULL THEN
      RETURN json_build_object('ok', false, 'reason', 'used');
    END IF;

    IF v_sys_inv.expires_at <= NOW() THEN
      RETURN json_build_object('ok', false, 'reason', 'expired');
    END IF;

    RETURN json_build_object(
      'ok', true,
      'account_name', v_sys_inv.company_name,
      'role', 'owner',
      'expires_at', v_sys_inv.expires_at,
      'is_system_invite', true
    );
  END IF;

  RETURN json_build_object('ok', false, 'reason', 'not_found');
END;
$$;

ALTER FUNCTION public.peek_invitation(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.peek_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_invitation(TEXT) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.redeem_invitation(
  p_token_hash TEXT
) RETURNS UUID  -- the joined account_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_inv account_invitations%ROWTYPE;
  v_sys_inv system_invitations%ROWTYPE;
  v_old_account_id UUID;
  v_old_account_owner UUID;
  v_has_data BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- 1. Try matching account_invitations (team members)
  SELECT * INTO v_inv
  FROM account_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF FOUND THEN
    IF v_inv.accepted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Invitation has already been redeemed' USING ERRCODE = '22023';
    END IF;
    IF v_inv.expires_at <= NOW() THEN
      RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
    END IF;

    SELECT p.account_id, a.owner_user_id
    INTO v_old_account_id, v_old_account_owner
    FROM profiles p
    JOIN accounts a ON a.id = p.account_id
    WHERE p.user_id = v_caller_id;

    IF v_old_account_id IS NULL THEN
      RAISE EXCEPTION 'Caller has no profile' USING ERRCODE = '42501';
    END IF;

    IF v_old_account_id = v_inv.account_id THEN
      RAISE EXCEPTION 'You are already a member of this account' USING ERRCODE = '23505';
    END IF;

    IF v_old_account_owner <> v_caller_id THEN
      RAISE EXCEPTION 'You are already in a shared account; sign up with a different email to join this one' USING ERRCODE = '23505';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM contacts WHERE account_id = v_old_account_id
      UNION ALL SELECT 1 FROM conversations WHERE account_id = v_old_account_id
      UNION ALL SELECT 1 FROM broadcasts WHERE account_id = v_old_account_id
      LIMIT 1
    ) INTO v_has_data;

    IF v_has_data THEN
      RAISE EXCEPTION 'Your account already contains data; sign up with a different email to join this one' USING ERRCODE = '23505';
    END IF;

    UPDATE profiles
    SET account_id = v_inv.account_id,
        account_role = v_inv.role
    WHERE user_id = v_caller_id;

    UPDATE account_invitations
    SET accepted_at = NOW(),
        accepted_by_user_id = v_caller_id
    WHERE id = v_inv.id;

    DELETE FROM accounts WHERE id = v_old_account_id;

    RETURN v_inv.account_id;
  END IF;

  -- 2. Try matching system_invitations (tenant/company setup invites)
  SELECT * INTO v_sys_inv
  FROM system_invitations
  WHERE token_hash = p_token_hash OR raw_token = p_token_hash
  FOR UPDATE;

  IF FOUND THEN
    IF v_sys_inv.used_at IS NOT NULL THEN
      RAISE EXCEPTION 'Invitation has already been redeemed' USING ERRCODE = '22023';
    END IF;
    IF v_sys_inv.expires_at <= NOW() THEN
      RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
    END IF;

    SELECT p.account_id INTO v_old_account_id
    FROM profiles p
    WHERE p.user_id = v_caller_id;

    UPDATE system_invitations
    SET used_at = NOW(),
        used_by_user_id = v_caller_id
    WHERE id = v_sys_inv.id;

    UPDATE profiles
    SET account_role = 'owner'
    WHERE user_id = v_caller_id;

    -- Rename caller's account to the target company name if configured
    IF v_old_account_id IS NOT NULL AND v_sys_inv.company_name IS NOT NULL THEN
      UPDATE accounts
      SET name = v_sys_inv.company_name
      WHERE id = v_old_account_id;
    END IF;

    RETURN v_old_account_id;
  END IF;

  RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
END;
$$;

ALTER FUNCTION public.redeem_invitation(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.redeem_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation(TEXT) TO authenticated;
