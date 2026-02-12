import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyTOTP } from '@/lib/totp';
import { isEmailAuthorized } from '@/lib/admin-auth';

/**
 * POST /api/admin-saas/2fa/verify
 * Valida email (whitelist) + código TOTP do app autenticador e seta cookie de acesso.
 * Body: { email: string, codigo: string } (codigo = 6 dígitos do app)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const codigo = typeof body.codigo === 'string' ? body.codigo.replace(/\D/g, '') : '';

    if (!email || !codigo) {
      return NextResponse.json(
        { ok: false, error: 'E-mail e código são obrigatórios' },
        { status: 400 }
      );
    }

    if (codigo.length !== 6) {
      return NextResponse.json(
        { ok: false, error: 'Código deve ter 6 dígitos' },
        { status: 400 }
      );
    }

    if (!isEmailAuthorized(email)) {
      return NextResponse.json(
        { ok: false, error: 'E-mail não autorizado' },
        { status: 403 }
      );
    }

    const secret = process.env.ADMIN_TOTP_SECRET;
    if (!secret) {
      console.error('ADMIN_TOTP_SECRET não configurado');
      return NextResponse.json(
        { ok: false, error: '2FA não configurado no servidor' },
        { status: 500 }
      );
    }

    const isValid = verifyTOTP(secret, codigo);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: 'Código inválido ou expirado' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('admin_saas_access', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Erro ao verificar 2FA:', e);
    return NextResponse.json(
      { ok: false, error: 'Erro ao validar código' },
      { status: 500 }
    );
  }
}
