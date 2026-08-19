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

    const supabase = await createClient();

    // 1. Try sending via Supabase default auth mailer
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo,
    });

    if (resetErr) {
      console.warn("[forgot-password] Supabase default mailer failed or rate-limited:", resetErr.message);
      
      // 2. FALLBACK: Generate secure recovery link via Supabase Admin API and send via Gmail SMTP
      try {
        const adminClient = supabaseAdmin();
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail,
          options: { redirectTo },
        });

        if (!linkErr && linkData?.properties?.action_link) {
          await sendPasswordResetViaGmail(targetEmail, linkData.properties.action_link);
          return NextResponse.json({
            success: true,
            message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح (عبر خادم البريد الاحتياطي)!",
          });
        }
      } catch (fallbackErr: any) {
        console.error("[forgot-password] Gmail Fallback exception:", fallbackErr);
      }

      return NextResponse.json({ error: resetErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ غير متوقع أثناء إرسال البريد" },
      { status: 500 }
    );
  }
}
