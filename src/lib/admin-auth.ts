import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Função centralizada para verificar autorização de admin
 * 
 * ⚠️ SEGURANÇA CRÍTICA: Apenas permite acesso com cookie de verificação 2FA
 * NÃO há bypass de desenvolvimento ou outros métodos
 * 
 * Verifica se o usuário tem acesso ao painel admin através de:
 * 1. Cookie de acesso (admin_saas_access) - OBRIGATÓRIO
 * 
 * O cookie só é setado após:
 * - Login com 2FA via WhatsApp (validação do código)
 * - Código de acesso temporário via /api/admin-saas/gate
 */
export async function isAdminAuthorized(req: NextRequest): Promise<boolean> {
  // ✅ ÚNICO MÉTODO: Verificar cookie de acesso (setado após login 2FA ou gate code)
  const cookieStore = await cookies();
  const hasGate = cookieStore.get('admin_saas_access')?.value === '1';
  
  if (!hasGate) {
    return false;
  }

  return true;
}

/**
 * Retorna os emails autorizados para acesso admin
 */
export function getAuthorizedEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Verifica se um email está autorizado
 */
export function isEmailAuthorized(email: string): boolean {
  const allowed = getAuthorizedEmails();
  return allowed.includes(email.toLowerCase());
}

