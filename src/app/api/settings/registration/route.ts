import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCurrentAccount, requireRole, UnauthorizedError, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

/**
 * GET /api/settings/registration
 * Publicly readable endpoint with defensive fallback returning allowPublicSignup status.
 */
export async function GET() {
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

    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'allow_public_signup')
      .maybeSingle();

    if (error) {
      console.warn('[GET /api/settings/registration] System settings table error or missing, using default true:', error.message);
      return NextResponse.json({ allowPublicSignup: true });
    }

    if (!data) {
      return NextResponse.json({ allowPublicSignup: true });
    }

    const allowPublicSignup = typeof data.value === 'boolean' ? data.value : (data.value === 'true' || data.value === true);
    return NextResponse.json({ allowPublicSignup });
  } catch (err) {
    console.error('[GET /api/settings/registration] Fallback on error:', err);
    return NextResponse.json({ allowPublicSignup: true });
  }
}

/**
 * PUT /api/settings/registration
 * Authenticated endpoint to update the global public registration flag using user session & admin fallback.
 */
export async function PUT(request: Request) {
  try {
    const ctx = await requireRole('admin');

    const body = await request.json().catch(() => null);
    if (!body || typeof body.allowPublicSignup !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid body parameter: allowPublicSignup must be a boolean' },
        { status: 400 }
      );
    }

    const allowPublicSignup = body.allowPublicSignup;

    const adminClient = supabaseAdmin();
    const { error } = await adminClient
      .from('system_settings')
      .upsert({
        key: 'allow_public_signup',
        value: allowPublicSignup,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      });

    if (error) {
      console.error('[PUT /api/settings/registration] Error updating setting:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({ allowPublicSignup });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
