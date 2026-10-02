import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { corrigirLaudoTecnico } from '@/lib/chatgpt';
import { fetchStatusEmpresa, normalizeStatusNome } from '@/lib/statusEmpresa';
import { laudoTexto } from '@/lib/whatsapp-crm/os-detalhes';
import type { Usuario } from '@/lib/user-data/types';
import { POST as atualizarOsNaApi } from '@/app/api/ordens/update-status/route';
import { atualizarSessao, type AcaoPendente } from './sessao';

const CONFIRMACAO_MS = 15 * 60 * 1000;

const CONFIRMA = /^\s*(sim|s|confirmo|confirma|confirmado|pode salvar|pode|salva|salvar|ok|isso|manda)\b[\s!.]*$/i;
const CANCELA = /^\s*(n[aã]o|n|cancela|cancelar|cancelado|deixa|esquece)\b/i;

export function ehConfirmacao(texto: string): boolean {
  return texto.length <= 30 && CONFIRMA.test(texto);
}

export function ehCancelamento(texto: string): boolean {
  return texto.length <= 40 && CANCELA.test(texto);
}

interface OsAlvo {
  id: string;
  numero_os: string;
  status: string | null;
  status_tecnico: string | null;
  laudo: string | null;
  equipamento: string | null;
  marca: string | null;
  modelo: string | null;
  cliente_nome: string;
}

async function buscarOsDoTecnico(numero: string, usuario: Usuario): Promise<OsAlvo | null> {
  if (!usuario.empresa_id || !usuario.auth_user_id) return null;
  const { data } = await createAdminClient()
    .from('ordens_servico')
    .select('id, numero_os, status, status_tecnico, laudo, equipamento, marca, modelo, cliente:cliente_id ( nome )')
    .eq('numero_os', numero)
    .eq('empresa_id', usuario.empresa_id)
    .eq('tecnico_id', usuario.auth_user_id)
    .maybeSingle();
  if (!data) return null;
  const cliente = data.cliente as { nome?: string } | { nome?: string }[] | null;
  return {
    id: data.id,
    numero_os: String(data.numero_os),
    status: data.status,
    status_tecnico: data.status_tecnico,
    laudo: data.laudo,
    equipamento: data.equipamento,
    marca: data.marca,
    modelo: data.modelo,
    cliente_nome: (Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome)?.trim() || 'sem cliente',
  };
}

function identificacaoOs(os: OsAlvo): string {
  const aparelho = [os.equipamento, os.marca?.trim(), os.modelo?.trim()].filter(Boolean).join(' ');
  return `*OS #${os.numero_os}* (${os.cliente_nome}${aparelho ? ` — ${aparelho}` : ''})`;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function textoParaHtml(texto: string): string {
  return texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${escaparHtml(l)}</p>`)
    .join('');
}

/** A correção às vezes vem em bloco ```html ou com título "Laudo Técnico" que o técnico não escreveu. */
function limparHtmlCorrigido(html: string | null): string | null {
  if (!html) return null;
  const limpo = html
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    .replace(/^\s*<p>\s*(<strong>)?\s*laudo t[ée]cnico:?\s*(<\/strong>)?\s*<\/p>/i, '')
    .trim();
  return laudoTexto(limpo) ? limpo : null;
}

function osEntregue(os: OsAlvo): boolean {
  return normalizeStatusNome(os.status || '') === 'ENTREGUE';
}

function statusVaiParaOrcamentoConcluido(os: OsAlvo): boolean {
  const st = normalizeStatusNome(os.status_tecnico || '');
  return !(st.includes('ORCAMENTO') && st.includes('CONCLUIDO')) && st !== 'SEM REPARO' && !/REPARO CONCLUIDO/.test(st);
}

const RODAPE_CONFIRMACAO = 'Responda *SIM* para salvar ou *NÃO* para cancelar. Se quiser ajustar algo, é só me dizer.';

/** Corrige o laudo, guarda como pendente e devolve a mensagem de confirmação para o técnico. */
export async function prepararLaudo(
  usuario: Usuario,
  telefone: string,
  numero: string,
  textoTecnico: string,
  modo: 'substituir' | 'acrescentar' | undefined
): Promise<{ paraTecnico?: string; paraModelo: string }> {
  const os = await buscarOsDoTecnico(numero, usuario);
  if (!os) return { paraModelo: `OS #${numero} não encontrada entre as O.S. deste técnico.` };
  if (osEntregue(os)) return { paraModelo: `A OS #${numero} já foi entregue e está bloqueada para edição.` };
  if (textoTecnico.trim().length < 10) return { paraModelo: 'Texto do laudo muito curto; peça mais detalhes ao técnico.' };

  const laudoAtual = laudoTexto(os.laudo);
  if (laudoAtual && !modo) {
    return {
      paraModelo: `A OS #${numero} já tem laudo: "${laudoAtual.slice(0, 300)}". Pergunte se ele quer SUBSTITUIR o laudo atual ou ACRESCENTAR o novo texto, e chame preparar_laudo de novo com o modo.`,
    };
  }

  const corrigidoHtml = limparHtmlCorrigido(await corrigirLaudoTecnico(textoTecnico)) || textoParaHtml(textoTecnico);
  const corrigidoTexto = laudoTexto(corrigidoHtml) || textoTecnico.trim();
  const acrescentar = !!laudoAtual && modo === 'acrescentar';
  const laudoHtml = acrescentar ? `${os.laudo}${corrigidoHtml}` : corrigidoHtml;

  const acao: AcaoPendente = { tipo: 'laudo', os_id: os.id, numero_os: os.numero_os, laudo_html: laudoHtml };
  await atualizarSessao(telefone, usuario.id, {
    acao_pendente: acao,
    acao_expira_em: new Date(Date.now() + CONFIRMACAO_MS).toISOString(),
  });

  const avisos = [
    laudoAtual ? (acrescentar ? '➕ O texto será *acrescentado* ao laudo atual.' : '⚠️ Isso *substitui* o laudo atual.') : null,
    statusVaiParaOrcamentoConcluido(os) ? 'ℹ️ Como na bancada, o status passa para *ORÇAMENTO CONCLUÍDO*.' : null,
  ].filter(Boolean);

  return {
    paraTecnico: [
      `📝 *Laudo corrigido:*\n\n${corrigidoTexto}`,
      `Confirma que esse laudo é para a ${identificacaoOs(os)}?`,
      ...avisos,
      RODAPE_CONFIRMACAO,
    ].join('\n\n'),
    paraModelo:
      'Prévia do laudo corrigido e pedido de confirmação já enviados ao técnico. Não repita o laudo nem peça confirmação de novo; no máximo uma frase curta ou nada.',
  };
}

export async function listarStatusTecnico(empresaId: string | null | undefined): Promise<string[]> {
  const lista = await fetchStatusEmpresa(createAdminClient(), { empresaId, tipo: 'tecnico' });
  const nomes = lista.map((s) => s.nome).filter((n) => normalizeStatusNome(n) !== 'AGUARDANDO PECA');
  return nomes.length
    ? nomes
    : ['AGUARDANDO INÍCIO', 'EM ANÁLISE', 'ORÇAMENTO CONCLUÍDO', 'EM EXECUÇÃO', 'SEM REPARO', 'REPARO CONCLUÍDO'];
}

export async function prepararStatus(
  usuario: Usuario,
  telefone: string,
  numero: string,
  statusPedido: string
): Promise<{ paraTecnico?: string; paraModelo: string }> {
  const os = await buscarOsDoTecnico(numero, usuario);
  if (!os) return { paraModelo: `OS #${numero} não encontrada entre as O.S. deste técnico.` };
  if (osEntregue(os)) return { paraModelo: `A OS #${numero} já foi entregue e está bloqueada para edição.` };

  const opcoes = await listarStatusTecnico(usuario.empresa_id);
  const alvo = opcoes.find((s) => normalizeStatusNome(s) === normalizeStatusNome(statusPedido));
  if (!alvo) {
    return { paraModelo: `Status "${statusPedido}" não existe. Opções válidas: ${opcoes.join(', ')}. Pergunte qual ele quer.` };
  }
  if (normalizeStatusNome(alvo) === normalizeStatusNome(os.status_tecnico || '')) {
    return { paraModelo: `A OS #${numero} já está com o status ${alvo}.` };
  }

  const acao: AcaoPendente = { tipo: 'status', os_id: os.id, numero_os: os.numero_os, status: alvo };
  await atualizarSessao(telefone, usuario.id, {
    acao_pendente: acao,
    acao_expira_em: new Date(Date.now() + CONFIRMACAO_MS).toISOString(),
  });

  const finaliza = /REPARO CONCLUIDO/.test(normalizeStatusNome(alvo));
  return {
    paraTecnico: [
      `🔄 Confirma mudar o status da ${identificacaoOs(os)}?\n\n*${os.status_tecnico || 'sem status'}* → *${alvo}*`,
      finaliza ? 'ℹ️ Isso conclui o reparo: registra a data de conclusão e a comissão, como na bancada.' : null,
      RODAPE_CONFIRMACAO,
    ]
      .filter(Boolean)
      .join('\n\n'),
    paraModelo: 'Pedido de confirmação da mudança de status já enviado ao técnico. Não peça confirmação de novo; no máximo uma frase curta ou nada.',
  };
}

/** Executa a ação confirmada pelo mesmo caminho da bancada (histórico, notificações, comissão, CRM). */
export async function executarAcao(usuario: Usuario, acao: AcaoPendente): Promise<string> {
  const os = await buscarOsDoTecnico(acao.numero_os, usuario);
  if (!os || os.id !== acao.os_id) return `❌ A OS #${acao.numero_os} não está mais atribuída a você. Nada foi alterado.`;
  if (osEntregue(os)) return `❌ A OS #${acao.numero_os} já foi entregue e está bloqueada para edição.`;

  const corpo: Record<string, unknown> = { osId: os.id, usuario_id: usuario.id, usuario_nome: usuario.nome };
  if (acao.tipo === 'laudo') corpo.laudo = acao.laudo_html;
  else corpo.newStatusTecnico = acao.status;

  const resposta = await atualizarOsNaApi(
    new NextRequest('http://localhost/api/ordens/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  );
  const resultado = (await resposta.json().catch(() => ({}))) as {
    error?: string;
    data?: { status_tecnico?: string };
  };
  if (!resposta.ok) return `❌ Não consegui salvar: ${resultado.error || 'erro desconhecido'}.`;

  const statusFinal = resultado.data?.status_tecnico;
  return acao.tipo === 'laudo'
    ? `✅ Laudo salvo na *OS #${acao.numero_os}*.${statusFinal ? `\nStatus técnico: *${statusFinal}*` : ''}`
    : `✅ Status da *OS #${acao.numero_os}* alterado para *${statusFinal || acao.status}*.`;
}
