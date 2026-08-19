import { NextResponse } from "next/server";
import { hashInviteToken } from "@/lib/auth/invitations";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHashParam = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const targetOrigin = isLocalEnv
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin;

  const supabase = await createClient();

  // 1. Handle token_hash & OTP type if present (e.g. recovery / signup)
  if (tokenHashParam && typeParam) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHashParam,
      type: typeParam as any,
    });
    if (!otpError) {
      return NextResponse.redirect(`${targetOrigin}${next}`);
    }
    console.error("[Auth Callback Route] verifyOtp error:", otpError);
  }

  // 2. Handle PKCE authorization code exchange if present
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Auto-redeem invitation if next points to /join/[token]
      if (next.includes("/join/")) {
        const rawToken = next.split("/join/")[1]?.split("?")[0]?.split("#")[0];
        if (rawToken) {
          try {
            const decodedToken = decodeURIComponent(rawToken);
            const tokenHash = hashInviteToken(decodedToken);
            
            let { data: redeemData, error: redeemError } = await supabase.rpc(
              "redeem_invitation",
              { p_token_hash: tokenHash }
            );

            if (redeemError || !redeemData) {
              const retryRaw = await supabase.rpc("redeem_invitation", {
                p_token_hash: decodedToken,
              });
              if (!retryRaw.error && retryRaw.data) {
                redeemData = retryRaw.data;
                redeemError = null;
              }
            }

            if (!redeemError && redeemData) {
              console.log("[Auth Callback Route] Server Auto-Redeem success:", redeemData);
              return NextResponse.redirect(`${targetOrigin}/dashboard?welcome=true`);
            }
          } catch (err) {
            console.error("[Auth Callback Route] Auto-Redeem exception:", err);
          }
        }
      }

      return NextResponse.redirect(`${targetOrigin}${next}`);
    }
    console.error("[Auth Callback Route] exchangeCodeForSession error:", error);
  }

  // 3. Passthrough for implicit recovery hash links (e.g. next=/reset-password)
  // When tokens arrive in URL hash (#access_token=...), browser JS hydrates on /reset-password
  if (next.includes("/reset-password") || next.includes("/join/")) {
    return NextResponse.redirect(`${targetOrigin}${next}`);
  }

  // Return user to login with error indicator if exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
