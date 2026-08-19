import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    let isAuthorized = false;

    // 1. Try Bearer token authorization header from client
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        if (userData.user.email === "mohamed701164@gmail.com") {
          isAuthorized = true;
        } else {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("account_role")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          if (prof?.account_role === "super_admin") {
            isAuthorized = true;
          }
        }
      }
    }

    // 2. Fallback to SSR cookie context check
    if (!isAuthorized) {
      try {
        const ctx = await getCurrentAccount();
        if (ctx.role === "super_admin" || ctx.profile.email === "mohamed701164@gmail.com") {
          isAuthorized = true;
        }
      } catch (err) {
        // Cookie context check failed
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Super Admin access required" },
        { status: 403 }
      );
    }

    // Super Admin Account ID
    const superAdminAccountId = "030a0ca4-2b5c-40d7-9d77-bb61b379b81a";
    const superAdminUserId = "775648fb-7972-4b77-9954-de06eaf9efa3";
    const wonStageId = "32e36076-be1c-42c6-94d1-5208c35744d6";

    // Fetch all accounts
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("id, name, created_at, owner_user_id")
      .order("created_at", { ascending: false });

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, account_id, account_role");

    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("account_id, plan, status, current_period_end");

    const { data: invitations } = await supabaseAdmin
      .from("system_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    let { data: deals } = await supabaseAdmin
      .from("deals")
      .select("id, title, value, status, contact_id");

    let { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, email, name, phone");

    const profileMap = new Map();
    (profiles || []).forEach((p) => {
      if (p.user_id) profileMap.set(p.user_id, p);
      if (p.account_id && !profileMap.has(p.account_id)) {
        profileMap.set(p.account_id, p);
      }
    });

    const subMap = new Map();
    (subscriptions || []).forEach((s) => {
      subMap.set(s.account_id, s);
    });

    const origin = "https://vorder-app.vercel.app";

    const allTenants = [];

    for (const acc of accounts || []) {
      const ownerProfile = profileMap.get(acc.owner_user_id) || profileMap.get(acc.id);
      const sub = subMap.get(acc.id);

      const ownerEmail = (ownerProfile?.email || "").trim().toLowerCase();
      const ownerName = ownerProfile?.full_name || acc.name || "مالك الشركة";

      // Skip super admin account from tenants list
      if (ownerEmail === "mohamed701164@gmail.com" || ownerProfile?.account_role === "super_admin") {
        continue;
      }

      // Match invitation by used_by_user_id or company_name
      let inv = (invitations || []).find(
        (i) => (i.used_by_user_id && i.used_by_user_id === acc.owner_user_id) ||
               (i.company_name && i.company_name.trim().toLowerCase() === acc.name.trim().toLowerCase())
      );

      let invToken = inv?.raw_token || inv?.token_hash || null;
      let invUrl = inv?.invitation_url || null;

      if (!invUrl) {
        if (invToken) {
          invUrl = `${origin}/join/${invToken}`;
        } else {
          const autoToken = `tn_${acc.id.substring(0, 8)}`;
          invUrl = `${origin}/join/${autoToken}`;
          await supabaseAdmin.from("system_invitations").insert({
            company_name: acc.name,
            plan_type: sub?.plan || "monthly",
            duration_days: 30,
            token_hash: autoToken,
            raw_token: autoToken,
            invitation_url: invUrl,
            used_at: acc.created_at,
            used_by_user_id: acc.owner_user_id,
          });
          invToken = autoToken;
        }
      }

      // 1. Case-insensitive contact matching
      let matchedContact = (contacts || []).find(
        (c) => c.email && c.email.trim().toLowerCase() === ownerEmail
      );

      // Auto-create contact if missing
      if (!matchedContact && ownerEmail) {
        const { data: newContact } = await supabaseAdmin
          .from("contacts")
          .insert({
            account_id: superAdminAccountId,
            user_id: superAdminUserId,
            name: ownerName,
            email: ownerEmail,
            phone: `2010${Math.floor(10000000 + Math.random() * 90000000)}`,
            company_name: acc.name,
            created_at: acc.created_at,
          })
          .select("id, email, name, phone")
          .single();

        if (newContact) {
          matchedContact = newContact;
          (contacts = contacts || []).push(newContact);
        }
      }

      // 2. Deal matching
      let matchedDeal = (deals || []).find(
        (d) => d.title.includes(acc.name) || (ownerEmail && d.title.includes(ownerEmail))
      );

      // Auto-create deal in Won stage if missing
      if (!matchedDeal) {
        const dealTitle = `اشتراك منصة - ${acc.name}`;
        const { data: newDeal } = await supabaseAdmin
          .from("deals")
          .insert({
            account_id: superAdminAccountId,
            user_id: superAdminUserId,
            stage_id: wonStageId,
            contact_id: matchedContact?.id || null,
            title: dealTitle,
            value: 1000,
            status: "won",
            position: 0,
            created_at: acc.created_at,
            updated_at: acc.created_at,
          })
          .select("id, title, value, status, contact_id")
          .single();

        if (newDeal) {
          matchedDeal = newDeal;
          (deals = deals || []).push(newDeal);
        }
      }

      let daysRemaining = 30;
      if (sub && sub.current_period_end) {
        const diffMs = new Date(sub.current_period_end).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      allTenants.push({
        id: acc.id,
        company_name: acc.name,
        owner_email: ownerProfile?.email || ownerEmail,
        owner_name: ownerName,
        role: ownerProfile?.account_role || "owner",
        created_at: acc.created_at,
        plan: sub?.plan || "monthly",
        status: sub?.status || "active",
        current_period_end: sub?.current_period_end || null,
        days_remaining: daysRemaining,
        invitation_token: invToken,
        invitation_url: invUrl,
        linked_deal_id: matchedDeal?.id || null,
        linked_deal_value: matchedDeal?.value ?? 1000,
        linked_contact_id: matchedContact?.id || null,
      });
    }

    return NextResponse.json({
      tenants: allTenants,
      availableContacts: contacts || [],
      availableDeals: deals || [],
      invitations: invitations || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unauthorized: Super Admin access required" },
      { status: 401 }
    );
  }
}
