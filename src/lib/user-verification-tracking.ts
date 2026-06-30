export type UsuarioVerificacaoRow = {
  email_verificado?: boolean | null;
  email_verificado_em?: string | null;
  verificacao_liberada_admin?: boolean | null;
  verificacao_liberada_em?: string | null;
  verificacao_liberada_por?: string | null;
  primeiro_login_em?: string | null;
};

export type VerificacaoEmailStatus =
  | 'verificado_codigo'
  | 'liberado_admin'
  | 'verificado_cadastro'
  | 'pendente';

export function usuarioPassouVerificacaoEmail(u: UsuarioVerificacaoRow): boolean {
  if (u.verificacao_liberada_admin === true) return true;
  if (u.email_verificado === true) return true;
  return false;
}

export function resolveVerificacaoEmailStatus(u: UsuarioVerificacaoRow): VerificacaoEmailStatus {
  if (u.email_verificado_em) return 'verificado_codigo';
  if (u.verificacao_liberada_admin === true) return 'liberado_admin';
  if (u.email_verificado === true) return 'verificado_cadastro';
  return 'pendente';
}

export const VERIFICACAO_EMAIL_LABEL: Record<VerificacaoEmailStatus, string> = {
  verificado_codigo: 'Verificado por código',
  liberado_admin: 'Liberado pelo admin',
  verificado_cadastro: 'Verificado no cadastro',
  pendente: 'Pendente',
};

export function formatarDataAdmin(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
