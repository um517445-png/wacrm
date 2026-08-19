import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { generateInviteToken, inviteExpiresAt } from "@/lib/auth/invitations";
import { supabaseAdmin } from "@/lib/automations/admin-client";

export async function POST(request: Request) {
  try {
    const adminClient = supabaseAdmin();
    let isAuthorized = false;

    // 1. Try Bearer token authorization header from client
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: userData } = await adminClient.auth.getUser(token);
      if (userData?.user) {
        if (userData.user.email === "mohamed701164@gmail.com") {
          isAuthorized = true;
        } else {
          const { data: prof } = await adminClient
            .from("profiles")
            .select("account_role")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          if (prof?.account_role === "super_admin" || prof?.account_role === "owner" || prof?.account_role === "admin") {
            isAuthorized = true;
          }
        }
      }
    }

    // 2. Fallback to SSR cookie context check
    if (!isAuthorized) {
      try {
        const ctx = await requireRole("owner");
        if (ctx) isAuthorized = true;
      } catch (err) {
        // Cookie check failed
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Super Admin or Owner access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const companyName = body?.companyName || "New Company";
    const durationDays = typeof body?.durationDays === "number" ? body.durationDays : 30;
    const planType = body?.planType || "monthly";

    const { token, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(30);

    const setupUrl = `https://vorder-app.vercel.app/join/${token}`;

    const { data, error } = await adminClient
      .from("system_invitations")
      .insert({
        token_hash: hash,
        raw_token: token,
        invitation_url: setupUrl,
        company_name: companyName,
        plan_type: planType,
        duration_days: durationDays,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, company_name, plan_type, duration_days, expires_at, invitation_url, raw_token")
      .single();

    if (error || !data) {
      console.error("[POST /api/admin/tenants/invitations] Insert error:", error);
      return NextResponse.json({ error: "Failed to create tenant invitation" }, { status: 500 });
    }

    return NextResponse.json(
      {
        invitation: data,
        token,
        url: setupUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
