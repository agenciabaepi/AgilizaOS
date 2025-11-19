import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, codigo } = await req.json();

    if (!email || !codigo) {
      return NextResponse.json(
        { ok: false, error: 'Email e código são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o email é de um admin autorizado
    const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: 'Email não autorizado' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Buscar código não usado e não expirado
    const { data: codeData, error: codeError } = await supabase
      .from('admin_2fa_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('codigo', codigo.trim())
      .eq('usado', false)
      .eq('expirado', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeData) {
      // Incrementar tentativas em códigos existentes para este email
      await supabase
        .from('admin_2fa_codes')
        .update({ tentativas: supabase.raw('tentativas + 1') })
        .eq('email', email.toLowerCase())
        .eq('codigo', codigo.trim())
        .eq('usado', false);

      return NextResponse.json(
        { ok: false, error: 'Código inválido ou expirado' },
        { status: 400 }
      );
    }

    // Verificar se expirou
    const expiresAt = new Date(codeData.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      await supabase
        .from('admin_2fa_codes')
        .update({ expirado: true })
        .eq('id', codeData.id);

      return NextResponse.json(
        { ok: false, error: 'Código expirado. Solicite um novo código.' },
        { status: 400 }
      );
    }

    // Verificar tentativas
    if (codeData.tentativas >= codeData.max_tentativas) {
      await supabase
        .from('admin_2fa_codes')
        .update({ expirado: true })
        .eq('id', codeData.id);

      return NextResponse.json(
        { ok: false, error: 'Número máximo de tentativas excedido. Solicite um novo código.' },
        { status: 400 }
      );
    }

    // Marcar código como usado
    await supabase
      .from('admin_2fa_codes')
      .update({
        usado: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', codeData.id);

    // Criar cookie de acesso ao admin
    const cookieStore = await cookies();
    cookieStore.set('admin_saas_access', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    // Criar cookie com email do admin
    cookieStore.set('admin_saas_email', email.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    console.log(`✅ Código 2FA validado com sucesso para ${email}`);

    return NextResponse.json({
      ok: true,
      message: 'Código validado com sucesso',
      redirect: '/admin-saas',
    });
  } catch (error: any) {
    console.error('❌ Erro ao verificar código 2FA:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

