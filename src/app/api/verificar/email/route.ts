import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/verificar/email
 * Body: { email, excludeId?, empresa_id? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const { excludeId, empresa_id } = body;

    if (!email) {
      return NextResponse.json({ exists: false, available: true });
    }

    const admin = getSupabaseAdmin();

    if (excludeId) {
      const { data: me } = await admin
        .from('usuarios')
        .select('id, email')
        .eq('id', excludeId)
        .maybeSingle();

      if (me?.email?.trim().toLowerCase() === email) {
        return NextResponse.json({ exists: false, available: true });
      }
    }

    let query = admin.from('usuarios').select('id').eq('email', email);
    if (empresa_id) {
      query = query.eq('empresa_id', empresa_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Erro ao verificar e-mail:', error);
      return NextResponse.json({ exists: false, available: true });
    }

    if (!data) {
      return NextResponse.json({ exists: false, available: true });
    }

    if (excludeId && data.id === excludeId) {
      return NextResponse.json({ exists: false, available: true });
    }

    return NextResponse.json({ exists: true, available: false });
  } catch (error) {
    console.error('Erro POST /api/verificar/email:', error);
    return NextResponse.json({ exists: false, available: true });
  }
}
