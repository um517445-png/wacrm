import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(`admin:branding:${ctx.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const brandingName = formData.get("branding_name") as string | null;

    let logoUrl: string | undefined = undefined;

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Logo file size must be 2MB or less" }, { status: 400 });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, WEBP, SVG" }, { status: 400 });
      }

      const fileExt = file.name.split(".").pop() || "png";
      const filePath = `${ctx.accountId}/logo-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await ctx.supabase.storage
        .from("branding")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error("[POST /api/account/branding] Storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload logo file" }, { status: 500 });
      }

      const { data: publicUrlData } = ctx.supabase.storage
        .from("branding")
        .getPublicUrl(uploadData.path);

      logoUrl = publicUrlData.publicUrl;
    }

    const updatePayload: Record<string, any> = {};
    if (logoUrl !== undefined) updatePayload.logo_url = logoUrl;
    if (typeof brandingName === "string" && brandingName.trim().length > 0) {
      updatePayload.branding_name = brandingName.trim();
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data: updatedAccount, error: updateError } = await ctx.supabase
        .from("accounts")
        .update(updatePayload)
        .eq("id", ctx.accountId)
        .select("id, name, logo_url, branding_name")
        .single();

      if (updateError) {
        console.error("[POST /api/account/branding] DB update error:", updateError);
        return NextResponse.json({ error: "Failed to update account branding" }, { status: 500 });
      }

      // Sync to system_settings table as well for global branding consistency
      if (logoUrl) {
        try {
          const { supabaseAdmin } = await import("@/lib/automations/admin-client");
          await supabaseAdmin().from("system_settings").upsert(
            {
              key: "brand_logo_url",
              value: logoUrl,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userId,
            },
            { onConflict: "key" }
          );
        } catch (syncErr) {
          console.error("[POST /api/account/branding] system_settings sync error:", syncErr);
        }
      }

      return NextResponse.json({ account: updatedAccount });
    }

    return NextResponse.json({ message: "No changes provided" });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE() {
  try {
    const ctx = await requireRole("admin");

    const { data: updatedAccount, error: updateError } = await ctx.supabase
      .from("accounts")
      .update({ logo_url: null })
      .eq("id", ctx.accountId)
      .select("id, name, logo_url, branding_name")
      .single();

    if (updateError) {
      console.error("[DELETE /api/account/branding] DB update error:", updateError);
      return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 });
    }

    return NextResponse.json({ account: updatedAccount });
  } catch (err) {
    return toErrorResponse(err);
  }
}
