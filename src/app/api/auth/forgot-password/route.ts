import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { sendPasswordResetViaGmail } from "@/lib/email/gmail-fallback";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }

    const targetEmail = email.trim();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

    const adminClient = supabaseAdmin();
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: { redirectTo },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[forgot-password] generateLink error:", linkErr);
      return NextResponse.json(
        { error: linkErr?.message || "لم نتمكن من العثور على هذا البريد الإلكتروني بالمنظومة" },
        { status: 400 }
      );
    }

    const hashedToken = linkData.properties.hashed_token;
    const directActionLink = hashedToken
      ? `${siteUrl}/auth/callback?token_hash=${hashedToken}&type=recovery&next=/reset-password`
      : linkData.properties.action_link;

    await sendPasswordResetViaGmail(targetEmail, directActionLink);

    return NextResponse.json({
      success: true,
      message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!",
    });
  } catch (err: any) {
    console.error("[forgot-password] Exception:", err);
    return NextResponse.json(
      { error: err.message || "حدث خطأ غير متوقع أثناء إرسال البريد" },
      { status: 500 }
    );
  }
}
