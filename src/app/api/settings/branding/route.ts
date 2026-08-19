import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UnauthorizedError } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

const DEFAULT_BRANDING = {
  logoUrl: '/vorder-logo.png',
  nameAr: 'WA CRM | فوردَر',
  nameEn: 'WA CRM | Vorder',
};

/**
 * GET /api/settings/branding
 * Reads branding settings using admin client to bypass RLS restrictions.
 * Returns brand_logo_url, brand_name_ar, and brand_name_en.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from('system_settings')
      .select('key, value')
      .in('key', ['brand_logo_url', 'brand_name_ar', 'brand_name_en']);

    if (error) {
      console.error('[GET /api/settings/branding] DB error:', error.message);
      return NextResponse.json(DEFAULT_BRANDING);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_BRANDING);
    }

    const branding = { ...DEFAULT_BRANDING };
    data.forEach((item) => {
      const val = typeof item.value === 'string' ? item.value.trim() : JSON.stringify(item.value).replace(/^"|"$/g, '').trim();
      if (!val) return;
      if (item.key === 'brand_logo_url') branding.logoUrl = val;
      if (item.key === 'brand_name_ar') branding.nameAr = val;
      if (item.key === 'brand_name_en') branding.nameEn = val;
    });

    return NextResponse.json(branding);
  } catch (err) {
    console.error('[GET /api/settings/branding] Error:', err);
    return NextResponse.json(DEFAULT_BRANDING);
  }
}

/**
 * PUT /api/settings/branding
 * Authenticated endpoint to update white-label branding settings (logo, nameAr, nameEn).
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const body = await request.json();
    let { logoUrl, nameAr, nameEn } = body;
    const adminClient = supabaseAdmin();

    // If logoUrl is a base64 data URL, upload to Supabase Storage bucket 'branding'
    if (typeof logoUrl === 'string' && logoUrl.startsWith('data:image/')) {
      try {
        try {
          const { data: buckets } = await adminClient.storage.listBuckets();
          if (!buckets?.some((b: any) => b.name === 'branding')) {
            await adminClient.storage.createBucket('branding', { public: true });
          }
        } catch (bErr) {
          // Bucket creation warning ignored if already existing
        }

        const matches = logoUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = contentType.split('/')[1] || 'png';
          const filePath = `system/logo-${Date.now()}.${ext}`;

          const { data: uploadData, error: uploadError } = await adminClient.storage
            .from('branding')
            .upload(filePath, buffer, { upsert: true, contentType });

          if (!uploadError && uploadData?.path) {
            const { data: publicUrlData } = adminClient.storage
              .from('branding')
              .getPublicUrl(uploadData.path);
            logoUrl = publicUrlData.publicUrl;
          } else {
            console.error('[PUT /api/settings/branding] Storage upload error:', uploadError);
          }
        }
      } catch (uploadErr) {
        console.error('[PUT /api/settings/branding] Base64 upload exception:', uploadErr);
      }
    }

    const updates = [
      { key: 'brand_logo_url', value: logoUrl || DEFAULT_BRANDING.logoUrl },
      { key: 'brand_name_ar', value: nameAr || DEFAULT_BRANDING.nameAr },
      { key: 'brand_name_en', value: nameEn || DEFAULT_BRANDING.nameEn },
    ];

    for (const item of updates) {
      const { error } = await adminClient
        .from('system_settings')
        .upsert(
          {
            key: item.key,
            value: item.value,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: 'key' }
        );

      if (error) {
        console.error(`[PUT /api/settings/branding] Failed to update ${item.key}:`, error);
      }
    }

    // Also update accounts table logo_url & branding_name for the user's primary account
    const { data: member } = await adminClient
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (member?.account_id) {
      await adminClient
        .from('accounts')
        .update({
          logo_url: logoUrl || DEFAULT_BRANDING.logoUrl,
          branding_name: nameAr || nameEn || DEFAULT_BRANDING.nameAr,
        })
        .eq('id', member.account_id);
    }

    return NextResponse.json({
      logoUrl: logoUrl || DEFAULT_BRANDING.logoUrl,
      nameAr: nameAr || DEFAULT_BRANDING.nameAr,
      nameEn: nameEn || DEFAULT_BRANDING.nameEn,
    });
  } catch (err: any) {
    console.error('[PUT /api/settings/branding] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update branding settings' },
      { status: 500 }
    );
  }
}
