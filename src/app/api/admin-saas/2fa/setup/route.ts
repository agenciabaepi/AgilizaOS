import { NextResponse } from 'next/server';
import { generateTOTPSecret, generateTOTPURI } from '@/lib/totp';
import QRCode from 'qrcode';

/**
 * GET /api/admin-saas/2fa/setup
 * Gera um novo secret TOTP e URI para configurar app autenticador (Google Authenticator, Authy, etc.).
 * Use UMA VEZ: copie o secret para ADMIN_TOTP_SECRET no .env e escaneie o QR no app.
 */
export async function GET() {
  try {
    const secret = generateTOTPSecret();
    const otpauthUrl = generateTOTPURI({
      secret,
      issuer: 'Admin SaaS',
      label: 'Admin',
    });

    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 220,
      margin: 2,
    });

    return NextResponse.json({
      ok: true,
      secret,
      otpauthUrl,
      qrDataUrl,
    });
  } catch (e) {
    console.error('Erro ao gerar setup 2FA:', e);
    return NextResponse.json(
      { ok: false, error: 'Erro ao gerar configuração 2FA' },
      { status: 500 }
    );
  }
}
