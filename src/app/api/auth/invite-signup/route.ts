import { NextResponse } from "next/server";
import { hashInviteToken } from "@/lib/auth/invitations";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;
    const fullName = body?.fullName || "User";
    const inviteToken = body?.inviteToken;

    if (!email || !password || !inviteToken) {
      return NextResponse.json(
        { error: "Email, password, and invite token are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Create user in Supabase Auth with email_confirm: true (Admin Auto-Confirm)
    // This bypasses Supabase GoTrue default SMTP rate limits completely (0 emails sent)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("[POST /api/auth/invite-signup] createUser error:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create user account" },
        { status: 400 }
      );
    }

    const newUser = userData?.user;
    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to provision user" },
        { status: 500 }
      );
    }

    // 2. Redeem invitation via RPC
    try {
      const tokenHash = hashInviteToken(inviteToken);
      const { data: redeemAccountId, error: redeemError } = await supabaseAdmin.rpc(
        "redeem_invitation",
        { p_token_hash: tokenHash }
      );

      if (redeemError) {
        console.warn("[POST /api/auth/invite-signup] redeem RPC warning:", redeemError);
      } else {
        console.log("[POST /api/auth/invite-signup] redeem RPC success:", redeemAccountId);
      }
    } catch (rErr) {
      console.error("[POST /api/auth/invite-signup] redeem exception:", rErr);
    }

    // 3. Sign in to generate valid session for the client
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.warn("[POST /api/auth/invite-signup] signIn error:", signInError);
      // Fallback response: user created and confirmed, client can sign in
      return NextResponse.json({
        ok: true,
        user: newUser,
        requiresLogin: false,
        message: "Account created successfully!",
      });
    }

    return NextResponse.json({
      ok: true,
      user: newUser,
      session: signInData.session,
      message: "Account created and confirmed successfully!",
    });
  } catch (err: any) {
    console.error("[POST /api/auth/invite-signup] Exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
