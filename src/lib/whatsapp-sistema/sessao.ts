import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabaseClient';
import { supabaseConfig } from '@/lib/supabase-config';
import type { Usuario } from '@/lib/user-data/types';

const TABELA = 'whatsapp_sistema_sessoes';
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 30 * 60 * 1000;
const FUSO = 'America/Sao_Paulo';

export interface AcaoPendente {
  tipo: 'laudo' | 'status';
  os_id: string;
  numero_os: string;
  /** laudo: HTML final a salvar */
  laudo_html?: string;
  /** status: nome exato do status do técnico */
  status?: string;
}

export interface SessaoTecnico {
  telefone: string;
  usuario_id: string | null;
  verificado_ate: string | null;
  aguardando_senha: boolean;
  mensagem_pendente: string | null;
  tentativas_senha: number;
  bloqueado_ate: string | null;
  acao_pendente: AcaoPendente | null;
  acao_expira_em: string | null;
  ultima_mensagem_id: string | null;
}

/** Último instante do dia corrente em São Paulo. */
function fimDoDia(): string {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
  return new Date(`${hoje}T23:59:59-03:00`).toISOString();
}

function horaSP(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

export async function carregarSessao(telefone: string): Promise<SessaoTecnico | null> {
  const { data } = await createAdminClient().from(TABELA).select('*').eq('telefone', telefone).maybeSingle();
  return (data as SessaoTecnico | null) ?? null;
}

export async function atualizarSessao(
  telefone: string,
  usuarioId: string,
  campos: Partial<Omit<SessaoTecnico, 'telefone' | 'usuario_id'>>
) {
  const { error } = await createAdminClient()
    .from(TABELA)
    .upsert({ telefone, usuario_id: usuarioId, ...campos, updated_at: new Date().toISOString() });
  if (error) console.error('[WhatsApp sistema] Falha ao salvar sessão:', error.message);
}

async function senhaConfere(usuario: Usuario, senha: string): Promise<boolean> {
  if (!usuario.auth_user_id || !senha) return false;
  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(usuario.auth_user_id);
  const email = authUser?.user?.email;
  if (!email) return false;

  const anon = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: senha });
  if (error || !data.session || data.user?.id !== usuario.auth_user_id) return false;

  // Só servia para validar a senha: encerra esta sessão sem derrubar as outras do técnico
  await admin.auth.admin.signOut(data.session.access_token, 'local').catch(() => undefined);
  return true;
}

export type ResultadoVerificacao =
  | { liberado: true; acabouDeVerificar: boolean; textoPendente: string | null }
  /** resposta null: mensagem repetida (reentrega da Meta), ignorar sem responder */
  | { liberado: false; resposta: string | null };

/** Marca a mensagem como processada; false se ela já tinha sido (reentrega). */
async function marcarMensagem(telefone: string, mensagemId: string, sessaoExiste: boolean): Promise<boolean> {
  if (!sessaoExiste) return true;
  const { data, error } = await createAdminClient()
    .from(TABELA)
    .update({ ultima_mensagem_id: mensagemId })
    .eq('telefone', telefone)
    .neq('ultima_mensagem_id', mensagemId)
    .select('telefone');
  if (error) {
    console.error('[WhatsApp sistema] Falha ao marcar mensagem processada:', error.message);
    return true;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Exige a senha do sistema na primeira conversa do dia.
 * A mensagem com a senha nunca vai para o histórico nem para a IA.
 */
export async function verificarSessao(
  usuario: Usuario,
  telefone: string,
  texto: string | null,
  mensagemId: string | undefined
): Promise<ResultadoVerificacao> {
  const sessao = await carregarSessao(telefone);
  const agora = Date.now();

  if (mensagemId) {
    if (!(await marcarMensagem(telefone, mensagemId, !!sessao))) return { liberado: false, resposta: null };
    if (!sessao) await atualizarSessao(telefone, usuario.id, { ultima_mensagem_id: mensagemId });
  }

  if (sessao?.verificado_ate && new Date(sessao.verificado_ate).getTime() > agora) {
    return { liberado: true, acabouDeVerificar: false, textoPendente: null };
  }

  if (sessao?.bloqueado_ate && new Date(sessao.bloqueado_ate).getTime() > agora) {
    return {
      liberado: false,
      resposta: `🔒 Muitas tentativas de senha erradas. Tente de novo depois das ${horaSP(sessao.bloqueado_ate)}.`,
    };
  }

  if (!sessao?.aguardando_senha) {
    await atualizarSessao(telefone, usuario.id, {
      aguardando_senha: true,
      mensagem_pendente: texto,
      tentativas_senha: 0,
      bloqueado_ate: null,
      acao_pendente: null,
      acao_expira_em: null,
    });
    const primeiroNome = usuario.nome?.trim().split(/\s+/)[0] || '';
    return {
      liberado: false,
      resposta: `🔐 Oi${primeiroNome ? `, ${primeiroNome}` : ''}! Por segurança, digite sua *senha de login do Gestão Consert* para liberar o assistente hoje.`,
    };
  }

  if (!texto) {
    return { liberado: false, resposta: '🔐 Primeiro digite sua *senha de login do Gestão Consert* em texto.' };
  }

  if (await senhaConfere(usuario, texto.trim())) {
    await atualizarSessao(telefone, usuario.id, {
      verificado_ate: fimDoDia(),
      aguardando_senha: false,
      mensagem_pendente: null,
      tentativas_senha: 0,
      bloqueado_ate: null,
    });
    return { liberado: true, acabouDeVerificar: true, textoPendente: sessao.mensagem_pendente };
  }

  const tentativas = (sessao.tentativas_senha ?? 0) + 1;
  if (tentativas >= MAX_TENTATIVAS) {
    const bloqueadoAte = new Date(agora + BLOQUEIO_MS).toISOString();
    await atualizarSessao(telefone, usuario.id, { tentativas_senha: 0, bloqueado_ate: bloqueadoAte, aguardando_senha: false });
    console.warn('[WhatsApp sistema] Senha errada repetidas vezes, bloqueado:', telefone);
    return {
      liberado: false,
      resposta: `🔒 Senha incorreta ${MAX_TENTATIVAS} vezes. Assistente bloqueado até ${horaSP(bloqueadoAte)}.`,
    };
  }

  await atualizarSessao(telefone, usuario.id, { tentativas_senha: tentativas });
  return {
    liberado: false,
    resposta: `❌ Senha incorreta. Tente de novo (${MAX_TENTATIVAS - tentativas} tentativa(s) restante(s)).`,
  };
}

export const AVISO_APAGAR_SENHA =
  '✅ Acesso liberado até o fim do dia.\n\n🗑️ Recomendo apagar a mensagem com a sua senha (segure a mensagem > Apagar).';
