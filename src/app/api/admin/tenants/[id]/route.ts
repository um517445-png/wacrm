import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantAccountId } = await params;
    const supabaseAdmin = createAdminClient();
    let isAuthorized = false;

    // 1. Bearer token check
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

    // 2. Cookie check fallback
    if (!isAuthorized) {
      try {
        const ctx = await getCurrentAccount();
        if (ctx.role === "super_admin" || ctx.profile.email === "mohamed701164@gmail.com") {
          isAuthorized = true;
        }
      } catch (err) {
        // Auth check failed
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { price, extendDays, status, contactId, dealId } = body;

    // Fetch account details to get company name
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("id, name")
      .eq("id", tenantAccountId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Tenant account not found" }, { status: 404 });
    }

    // 1. Update subscription period end if extendDays provided
    if (typeof extendDays === "number" && extendDays > 0) {
      const newPeriodEnd = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            account_id: tenantAccountId,
            status: status || "active",
            current_period_end: newPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id" }
        );
    }

    // 2. Update Subscription status if provided
    if (status) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("account_id", tenantAccountId);
    }

    // 3. Update specific target deal or matched deal
    const targetDealId = dealId;
    if (targetDealId) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (typeof price === "number" && price >= 0) updateData.value = price;
      if (contactId) updateData.contact_id = contactId;

      await supabaseAdmin
        .from("deals")
        .update(updateData)
        .eq("id", targetDealId);
    } else if (typeof price === "number" && price >= 0) {
      // Find matching deal for this tenant company
      const { data: matchingDeals } = await supabaseAdmin
        .from("deals")
        .select("id, title, value");

      const tenantDeal = (matchingDeals || []).find((d) =>
        d.title.includes(account.name) || d.title.includes(tenantAccountId)
      );

      if (tenantDeal) {
        const updateData: any = { value: price, updated_at: new Date().toISOString() };
        if (contactId) updateData.contact_id = contactId;

        await supabaseAdmin
          .from("deals")
          .update(updateData)
          .eq("id", tenantDeal.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث إعدادات وسعر اشتراك الشركة بنجاح!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update tenant subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantAccountId } = await params;
    const supabaseAdmin = createAdminClient();
    let isAuthorized = false;

    // 1. Bearer token check
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

    // 2. Cookie check fallback
    if (!isAuthorized) {
      try {
        const ctx = await getCurrentAccount();
        if (ctx.role === "super_admin" || ctx.profile.email === "mohamed701164@gmail.com") {
          isAuthorized = true;
        }
      } catch (err) {
        // Auth check failed
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Super Admin access required" },
        { status: 403 }
      );
    }

    // Protect Super Admin Account from deletion
    const superAdminAccountId = "030a0ca4-2b5c-40d7-9d77-bb61b379b81a";
    if (tenantAccountId === superAdminAccountId) {
      return NextResponse.json(
        { error: "لا يمكن حذف حساب مدير المنظومة (Super Admin Account)" },
        { status: 400 }
      );
    }

    // Fetch tenant details
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("id, name, owner_user_id")
      .eq("id", tenantAccountId)
      .maybeSingle();

    const ownerUserId = account?.owner_user_id;

    // 1. Delete subscription
    await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("account_id", tenantAccountId);

    // 2. Delete system invitations
    if (account?.name || ownerUserId) {
      await supabaseAdmin
        .from("system_invitations")
        .delete()
        .or(`company_name.eq.${account?.name || ""},used_by_user_id.eq.${ownerUserId || "00000000-0000-0000-0000-000000000000"}`);
    }

    // 3. Delete profiles
    if (ownerUserId) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", ownerUserId);
    }
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("account_id", tenantAccountId);

    // 4. Delete account
    await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", tenantAccountId);

    // 5. Delete Auth user from Supabase Auth
    if (ownerUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      } catch (e) {
        console.warn("[DELETE Tenant] Auth user deletion warning:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف اشتراك وحساب الشركة كلياً وبأمان من المنصة!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete tenant subscription" },
      { status: 500 }
    );
  }
}
