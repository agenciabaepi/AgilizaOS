import { createAdminClient } from './supabaseClient';
import { filterUsuariosTecnicos, TECNICOS_OR_FILTER } from '@/lib/tecnicos';
import { textoDetalhesOs } from '@/lib/whatsapp-crm/os-detalhes';
import { formatChecklistItemLabel } from '@/lib/checklist-values';

export const LIMITE_FOTOS_OS = 5;

interface ComissaoResumo {
  id: string;
  numero_os: number;
  cliente_nome: string;
  valor_comissao: number;
  data_entrega: string;
  status: string;
}

/**
 * Busca técnico pelo número de WhatsApp
 */
export async function getTecnicoByWhatsApp(whatsappNumber: string): Promise<{ id: string; nome: string; whatsapp: string } | null> {
  try {
    const supabase = createAdminClient();
    
    // Normalizar número (remover caracteres especiais)
    const normalizedNumber = whatsappNumber.replace(/\D/g, '');
    
    // Buscar todos os técnicos e filtrar localmente (mais flexível)
    const { data: tecnicos, error } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, nivel, tambem_tecnico')
      .or(TECNICOS_OR_FILTER);

    if (error) {
      console.error('❌ Erro ao buscar técnicos:', error);
      return null;
    }

    if (!tecnicos || tecnicos.length === 0) {
      return null;
    }

    const tecnicosValidos = filterUsuariosTecnicos(tecnicos);

    // Buscar técnico cujo WhatsApp corresponde (com diferentes formatos)
    const tecnico = tecnicosValidos.find(t => {
      if (!t.whatsapp) return false;
      
      const techWhatsapp = t.whatsapp.replace(/\D/g, '');
      const normalized = normalizedNumber;
      
      // Comparar diferentes formatos
      return techWhatsapp === normalized ||
             techWhatsapp === normalized.replace(/^55/, '') ||
             techWhatsapp === `55${normalized}` ||
             `55${techWhatsapp}` === normalized ||
             techWhatsapp.replace(/^55/, '') === normalized.replace(/^55/, '');
    });

    return tecnico || null;
  } catch (error) {
    console.error('❌ Erro interno ao buscar técnico por WhatsApp:', error);
    return null;
  }
}

/**
 * Busca comissões do técnico
 */
export async function getComissoesTecnico(tecnicoId: string, limit: number = 10): Promise<{
  comissoes: ComissaoResumo[];
  total: number;
  totalPago: number;
  totalPendente: number;
}> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('comissoes_historico')
      .select(`
        id,
        ordem_servico_id,
        valor_comissao,
        data_entrega,
        status,
        ordens_servico:ordem_servico_id (
          numero_os
        ),
        clientes:cliente_id (
          nome
        )
      `)
      .eq('tecnico_id', tecnicoId)
      .order('data_entrega', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar comissões:', error);
      return {
        comissoes: [],
        total: 0,
        totalPago: 0,
        totalPendente: 0
      };
    }

    // Calcular total
    const total = (data || []).reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    const totalPago = (data || []).filter(c => c.status === 'PAGA').reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    const totalPendente = (data || []).filter(c => c.status !== 'PAGA').reduce((acc, c) => acc + (c.valor_comissao || 0), 0);

    return {
      comissoes: (data || []).map((c: any) => ({
        id: c.id,
        numero_os: c.ordens_servico?.numero_os || 0,
        cliente_nome: c.clientes?.nome || 'N/A',
        valor_comissao: c.valor_comissao || 0,
        data_entrega: c.data_entrega,
        status: c.status || 'CALCULADA'
      })),
      total,
      totalPago,
      totalPendente
    };
  } catch (error) {
    console.error('❌ Erro interno ao buscar comissões:', error);
    return {
      comissoes: [],
      total: 0,
      totalPago: 0,
      totalPendente: 0
    };
  }
}

/**
 * Formata comissões para mensagem WhatsApp
 */
export function formatComissoesMessage(comissoes: ComissaoResumo[], total: number, totalPago: number, totalPendente: number, tecnicoNome: string): string {
  let message = `💰 *Suas Comissões*\n\n`;
  message += `Olá, ${tecnicoNome}!\n\n`;
  
  if (comissoes.length === 0) {
    message += `Você ainda não possui comissões registradas.\n`;
    return message;
  }

  message += `*Resumo:*\n`;
  message += `📊 Total: R$ ${total.toFixed(2).replace('.', ',')}\n`;
  message += `✅ Pagas: R$ ${totalPago.toFixed(2).replace('.', ',')}\n`;
  message += `⏳ Pendentes: R$ ${totalPendente.toFixed(2).replace('.', ',')}\n\n`;
  
  message += `*Últimas ${comissoes.length} comissões:*\n\n`;
  
  comissoes.forEach((comissao, index) => {
    const dataFormatada = new Date(comissao.data_entrega).toLocaleDateString('pt-BR');
    const statusEmoji = comissao.status === 'PAGA' ? '✅' : '⏳';
    const statusTexto = comissao.status === 'PAGA' ? 'Paga' : 'Pendente';
    
    message += `${index + 1}. OS #${comissao.numero_os}\n`;
    message += `   Cliente: ${comissao.cliente_nome}\n`;
    message += `   Valor: R$ ${comissao.valor_comissao.toFixed(2).replace('.', ',')}\n`;
    message += `   Data: ${dataFormatada}\n`;
    message += `   ${statusEmoji} ${statusTexto}\n\n`;
  });

  message += `\nDigite */comissoes* novamente para atualizar.`;

  return message;
}

/**
 * Busca senha do aparelho de uma OS pelo número
 * ⚠️ SEGURANÇA: Apenas técnicos podem buscar senhas, e apenas de OS que pertencem a eles
 */
export async function getSenhaOSPorNumero(
  numeroOS: string | number, 
  empresaId: string,
  tecnicoAuthUserId: string | null = null
): Promise<{
  numero_os: string;
  senha_aparelho: string | null;
  senha_padrao: string | null;
  cliente_nome: string;
  equipamento: string;
} | null> {
  try {
    const supabase = createAdminClient();
    
    // Buscar OS pelo número e empresa
    let query = supabase
      .from('ordens_servico')
      .select(`
        numero_os,
        senha_aparelho,
        senha_padrao,
        equipamento,
        empresa_id,
        tecnico_id,
        cliente:cliente_id (
          nome
        )
      `)
      .eq('numero_os', String(numeroOS))
      .eq('empresa_id', empresaId);

    // 🔒 SEGURANÇA CRÍTICA: Se tecnicoAuthUserId foi fornecido, verificar se a OS pertence a ele
    if (tecnicoAuthUserId) {
      query = query.eq('tecnico_id', tecnicoAuthUserId);
    }

    const { data: os, error } = await query.single();

    if (error || !os) {
      console.error('❌ Erro ao buscar OS:', error);
      return null;
    }

    // 🔒 VERIFICAÇÃO ADICIONAL: Se tecnicoAuthUserId foi fornecido, garantir que a OS pertence ao técnico
    if (tecnicoAuthUserId && os.tecnico_id !== tecnicoAuthUserId) {
      console.error('🚫 Acesso negado: OS não pertence ao técnico', {
        numeroOS,
        tecnicoAuthUserId,
        osTecnicoId: os.tecnico_id
      });
      return null;
    }

    return {
      numero_os: String(os.numero_os),
      senha_aparelho: os.senha_aparelho || null,
      senha_padrao: os.senha_padrao || null,
      cliente_nome: (os.cliente as any)?.nome || 'N/A',
      equipamento: os.equipamento || 'N/A'
    };
  } catch (error) {
    console.error('❌ Erro interno ao buscar senha da OS:', error);
    return null;
  }
}

/**
 * Formata mensagem de senha da OS para WhatsApp
 */
export function formatSenhaOSMessage(dadosOS: {
  numero_os: string;
  senha_aparelho: string | null;
  senha_padrao: string | null;
  cliente_nome: string;
  equipamento: string;
}): string {
  let message = `🔐 *Senha da OS #${dadosOS.numero_os}*\n\n`;
  
  if (dadosOS.senha_aparelho) {
    message += `🔑 *Senha do Aparelho:*\n`;
    message += `\`${dadosOS.senha_aparelho}\`\n\n`;
  } else {
    message += `⚠️ Senha do aparelho não foi informada.\n\n`;
  }
  
  if (dadosOS.senha_padrao) {
    try {
      const padrao = typeof dadosOS.senha_padrao === 'string' 
        ? JSON.parse(dadosOS.senha_padrao) 
        : dadosOS.senha_padrao;
      
      if (Array.isArray(padrao) && padrao.length > 0) {
        message += `📱 *Padrão Android:*\n`;
        message += `${padrao.join(' → ')}\n\n`;
      }
    } catch (e) {
      // Ignorar erro de parsing
    }
  }
  
  message += `📋 Cliente: ${dadosOS.cliente_nome}\n`;
  message += `📱 Equipamento: ${dadosOS.equipamento}\n`;
  
  return message;
}

export function extrairNumeroOs(texto: string): string | null {
  const numeros = texto.match(/\d+/g);
  if (!numeros?.length) return null;
  const candidatos = numeros.filter((n) => n.length >= 2 && n.length <= 5);
  return candidatos[0] ?? numeros[0];
}

export function pedidoDeFotos(texto: string): boolean {
  return /foto|imagem|picture/i.test(texto);
}

/** Resumo da O.S. Pedido de foto sem pedir dados não entra aqui. */
export function pedidoDeResumoOs(texto: string): boolean {
  if (!/(?:\bos\b|ordem)/i.test(texto)) return false;
  if (/senha|password/i.test(texto)) return false;
  if (pedidoDeFotos(texto) && !/dados|informa|status|resumo|detalh|situa|laudo|or[cç]amento|problema/i.test(texto)) {
    return false;
  }
  const palavras = texto.trim().split(/\s+/).length;
  const explicito = /dados|informa|status|resumo|detalh|situa|andamento|laudo|or[cç]amento/i.test(texto);
  return explicito || palavras <= 8;
}

export interface OsDoTecnico {
  numero_os: string;
  status: string | null;
  status_tecnico: string | null;
  equipamento: string | null;
  marca: string | null;
  modelo: string | null;
  problema_relatado: string | null;
  cliente_nome: string;
  laudo: string | null;
  servico: string | null;
  qtd_servico: number | null;
  valor_servico: number | null;
  peca: string | null;
  qtd_peca: number | null;
  valor_peca: number | null;
  desconto: number | null;
  valor_faturado: number | null;
  imagens: string | null;
  imagens_tecnico: string | null;
  categoria: string | null;
  cor: string | null;
  numero_serie: string | null;
  acessorios: string | null;
  condicoes_equipamento: string | null;
  observacao: string | null;
  tipo: string | null;
  atendente: string | null;
  data_cadastro: string | null;
  prazo_entrega: string | null;
  data_entrega: string | null;
  vencimento_garantia: string | null;
  checklist: ChecklistEntradaOs | null;
}

export interface ChecklistEntradaOs {
  aparelhoNaoLiga: boolean;
  funciona: string[];
  naoFunciona: string[];
}

async function checklistEntradaOs(
  supabase: ReturnType<typeof createAdminClient>,
  bruto: unknown
): Promise<ChecklistEntradaOs | null> {
  let dados: Record<string, unknown>;
  try {
    dados = typeof bruto === 'string' ? JSON.parse(bruto) : (bruto as Record<string, unknown>);
  } catch {
    return null;
  }
  if (!dados || typeof dados !== 'object') return null;

  const ids = Object.keys(dados).filter((k) => k !== 'aparelhoNaoLiga');
  const nomes = new Map<string, string>();
  const uuids = ids.filter((k) => /^[0-9a-f-]{36}$/i.test(k));
  if (uuids.length) {
    const { data } = await supabase.from('checklist_itens').select('id, nome').in('id', uuids);
    for (const item of data ?? []) nomes.set(item.id, formatChecklistItemLabel(item.nome));
  }

  const funciona: string[] = [];
  const naoFunciona: string[] = [];
  for (const id of ids) {
    const nome = nomes.get(id) ?? (uuids.includes(id) ? null : id);
    if (!nome) continue;
    const valor = dados[id];
    if (valor === true || valor === 'true' || valor === 'aprovado' || valor === 1) funciona.push(nome);
    else if (valor === false || valor === 'false' || valor === 'reprovado' || valor === 0) naoFunciona.push(nome);
  }

  const aparelhoNaoLiga = dados.aparelhoNaoLiga === true;
  if (!aparelhoNaoLiga && !funciona.length && !naoFunciona.length) return null;
  return { aparelhoNaoLiga, funciona, naoFunciona };
}

export function listarFotosOs(os: Pick<OsDoTecnico, 'imagens' | 'imagens_tecnico'>): string[] {
  const urls = [os.imagens, os.imagens_tecnico]
    .flatMap((campo) => (campo || '').split(','))
    .map((url) => url.trim())
    .filter((url) => /^https:\/\//i.test(url));
  return [...new Set(urls)];
}

/**
 * O.S. da empresa atribuída a este técnico. Null se não existe ou é de outro técnico.
 */
export async function getOsDoTecnico(
  numeroOS: string | number,
  empresaId: string,
  tecnicoAuthUserId: string
): Promise<OsDoTecnico | null> {
  try {
    const supabase = createAdminClient();
    const { data: os, error } = await supabase
      .from('ordens_servico')
      .select(`
        numero_os,
        status,
        status_tecnico,
        equipamento,
        marca,
        modelo,
        problema_relatado,
        laudo,
        servico,
        qtd_servico,
        valor_servico,
        peca,
        qtd_peca,
        valor_peca,
        desconto,
        valor_faturado,
        imagens,
        imagens_tecnico,
        categoria,
        cor,
        numero_serie,
        acessorios,
        condicoes_equipamento,
        observacao,
        tipo,
        atendente,
        data_cadastro,
        prazo_entrega,
        data_entrega,
        vencimento_garantia,
        checklist_entrada,
        tecnico_id,
        cliente:cliente_id ( nome )
      `)
      .eq('numero_os', String(numeroOS))
      .eq('empresa_id', empresaId)
      .eq('tecnico_id', tecnicoAuthUserId)
      .maybeSingle();

    if (error || !os) {
      console.error('Erro ao buscar OS do técnico:', error);
      return null;
    }

    if (os.tecnico_id !== tecnicoAuthUserId) return null;

    const cliente = os.cliente as { nome?: string } | { nome?: string }[] | null;
    const clienteNome = Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome;

    return {
      numero_os: String(os.numero_os),
      status: os.status || null,
      status_tecnico: os.status_tecnico || null,
      equipamento: os.equipamento || null,
      marca: os.marca || null,
      modelo: os.modelo || null,
      problema_relatado: os.problema_relatado || null,
      cliente_nome: clienteNome || 'N/A',
      laudo: os.laudo || null,
      servico: os.servico || null,
      qtd_servico: os.qtd_servico,
      valor_servico: os.valor_servico,
      peca: os.peca || null,
      qtd_peca: os.qtd_peca,
      valor_peca: os.valor_peca,
      desconto: os.desconto,
      valor_faturado: os.valor_faturado,
      imagens: os.imagens || null,
      imagens_tecnico: os.imagens_tecnico || null,
      categoria: os.categoria?.trim() || null,
      cor: os.cor?.trim() || null,
      numero_serie: os.numero_serie?.trim() || null,
      acessorios: os.acessorios?.trim() || null,
      condicoes_equipamento: os.condicoes_equipamento?.trim() || null,
      observacao: os.observacao?.trim() || null,
      tipo: os.tipo || null,
      atendente: os.atendente || null,
      data_cadastro: os.data_cadastro || null,
      prazo_entrega: os.prazo_entrega || null,
      data_entrega: os.data_entrega || null,
      vencimento_garantia: os.vencimento_garantia || null,
      checklist: await checklistEntradaOs(supabase, os.checklist_entrada),
    };
  } catch (error) {
    console.error('Erro interno ao buscar OS do técnico:', error);
    return null;
  }
}

/** Datas da O.S. vêm como data pura, timestamp sem fuso (hora local) ou com fuso. */
function dataOs(valor: string | null, comHora = false): string | null {
  if (!valor) return null;
  const pura = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pura) return `${pura[3]}/${pura[2]}/${pura[1]}`;
  const local = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::[\d.]+)?$/);
  if (local) return `${local[3]}/${local[2]}/${local[1]}${comHora ? ` ${local[4]}:${local[5]}` : ''}`;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    ...(comHora ? { timeStyle: 'short' as const } : {}),
  });
}

function textoChecklist(checklist: ChecklistEntradaOs | null): string | null {
  if (!checklist) return null;
  if (checklist.aparelhoNaoLiga) return '*Checklist de entrada:* aparelho não liga (itens não testados)';
  return [
    '*Checklist de entrada:*',
    `❌ Não funciona: ${checklist.naoFunciona.length ? checklist.naoFunciona.join(', ') : 'nenhum item'}`,
    checklist.funciona.length ? `✅ Funciona: ${checklist.funciona.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatResumoOsMessage(os: OsDoTecnico): string {
  const aparelho = [os.equipamento || os.categoria, os.marca?.trim(), os.modelo?.trim()].filter(Boolean).join(' · ');
  const problema = os.problema_relatado?.trim().slice(0, 500);
  const detalhes = textoDetalhesOs(os);
  const garantia = os.tipo && !/^normal$/i.test(os.tipo) ? os.tipo : null;
  const linhas = [
    `📋 *OS #${os.numero_os}*${garantia ? ` (${garantia})` : ''}`,
    '',
    `Cliente: ${os.cliente_nome}`,
    os.status ? `Status: ${os.status}` : null,
    os.status_tecnico ? `Status técnico: ${os.status_tecnico}` : null,
    dataOs(os.data_cadastro, true) ? `Entrada: ${dataOs(os.data_cadastro, true)}${os.atendente ? ` (atendente: ${os.atendente})` : ''}` : null,
    dataOs(os.prazo_entrega, true) ? `Prazo: ${dataOs(os.prazo_entrega, true)}` : null,
    dataOs(os.data_entrega) ? `Entregue em: ${dataOs(os.data_entrega)}` : null,
    dataOs(os.vencimento_garantia) ? `Garantia até: ${dataOs(os.vencimento_garantia)}` : null,
    '',
    '*Aparelho:*',
    aparelho ? aparelho : null,
    os.cor ? `Cor: ${os.cor}` : null,
    os.numero_serie ? `Nº de série/IMEI: ${os.numero_serie}` : null,
    os.acessorios ? `Acessórios: ${os.acessorios}` : null,
    os.condicoes_equipamento ? `Condições: ${os.condicoes_equipamento}` : null,
    problema ? `\n*Relato do cliente:*\n${problema}` : null,
    os.observacao ? `\n*Observação:*\n${os.observacao.slice(0, 400)}` : null,
    textoChecklist(os.checklist) ? `\n${textoChecklist(os.checklist)}` : null,
    detalhes ? `\n${detalhes}` : null,
  ];
  return linhas.filter((linha) => linha !== null).join('\n');
}

