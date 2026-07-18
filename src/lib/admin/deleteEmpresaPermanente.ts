import type { SupabaseClient } from '@supabase/supabase-js';
import { clearEmpresaWhatsAppData } from '@/lib/whatsapp-crm/conversations';

const CONFIRM_PHRASE = 'EXCLUIR PERMANENTEMENTE';

/** Tabelas com `empresa_id` — ordem: folhas / dependentes primeiro. */
const TABLES_WITH_EMPRESA_ID: readonly string[] = [
  // WhatsApp (também via clearEmpresaWhatsAppData; reforço explícito)
  'whatsapp_os_contexto',
  'whatsapp_conversa_notas',
  'whatsapp_mensagens',
  'whatsapp_conversas',
  'whatsapp_automacoes',
  'whatsapp_empresa_config',

  // Históricos e vínculos de OS
  'status_historico',
  'os_historico',
  'comissoes_historico',

  // Financeiro / caixa
  'movimentacoes_caixa',
  'turnos_caixa',
  'caixas',
  'fluxo_caixa',
  'vendas',
  'devolucoes',
  'orcamentos',
  'orcamentos_emitidos',
  'contas_pagar',
  'categorias_contas',
  'config_avisos_contas_pagar',

  // Operação
  'ordens_servico',
  'clientes',
  'fornecedores',

  // Catálogo / produtos
  'catalogo_itens',
  'catalogo_categorias',
  'produtos_servicos',
  'produtos',
  'servicos',
  'subcategorias_produtos',
  'categorias_produtos',
  'grupos_produtos',
  'marcas_produtos',
  'aparelhos_empresa',
  'equipamentos_tipos',
  'checklist_itens',

  // Config / UX
  'configuracoes_empresa',
  'configuracoes_comissao',
  'configuracoes_precificacao',
  'termos_garantia',
  'colunas_dashboard',
  'notas_dashboard',
  'avisos_sistema',
  'onboarding_status',

  // Suporte / notificações
  'tickets_suporte',
  'notificacoes',

  // Billing / SMS / auditoria
  'cupons_uso',
  'pagamentos',
  'assinaturas',
  'sms_envios',
  'admin_impersonation_logs',
];

type DeleteStep = { step: string; ok: boolean; detail?: string };

function isIgnorableTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the') ||
    (msg.includes('column') && msg.includes('empresa_id'))
  );
}

async function listIds(
  supabase: SupabaseClient,
  table: string,
  empresaId: string,
  columns = 'id'
): Promise<string[]> {
  const { data, error } = await supabase.from(table).select(columns).eq('empresa_id', empresaId);
  if (error) {
    if (isIgnorableTableError(error)) return [];
    console.warn(`[deleteEmpresa] listIds ${table}:`, error.message);
    return [];
  }
  return (data || []).map((row: { id?: string }) => row.id).filter(Boolean) as string[];
}

async function listStorageFilesRecursive(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
  if (error || !data) return [];

  const files: string[] = [];
  const dirs: string[] = [];

  for (const item of data) {
    const full = path ? `${path}/${item.name}` : item.name;
    if (item.id) {
      files.push(full);
    } else if (item.name) {
      dirs.push(full);
    }
  }

  for (const dir of dirs) {
    const nested = await listStorageFilesRecursive(supabase, bucket, dir);
    files.push(...nested);
  }

  return files;
}

async function removeStoragePrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<{ removed: number; error?: string }> {
  try {
    const files = await listStorageFilesRecursive(supabase, bucket, prefix);
    if (files.length === 0) return { removed: 0 };

    let removed = 0;
    const BATCH = 100;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) {
        return { removed, error: error.message };
      }
      removed += batch.length;
    }
    return { removed };
  } catch (err) {
    return {
      removed: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function extractStoragePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
    }
    // fallback: path relativo
    if (!url.startsWith('http') && url.includes('/')) return url.replace(/^\//, '');
  } catch {
    /* ignore */
  }
  return null;
}

async function deleteByEmpresaId(
  supabase: SupabaseClient,
  table: string,
  empresaId: string
): Promise<DeleteStep> {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .eq('empresa_id', empresaId);

  if (error) {
    if (isIgnorableTableError(error)) {
      return { step: `db:${table}`, ok: true, detail: 'tabela/coluna inexistente (ignorada)' };
    }
    return { step: `db:${table}`, ok: false, detail: error.message };
  }
  return { step: `db:${table}`, ok: true, detail: `${count ?? 0} linha(s)` };
}

async function deleteTicketsComentarios(
  supabase: SupabaseClient,
  empresaId: string
): Promise<DeleteStep> {
  const ticketIds = await listIds(supabase, 'tickets_suporte', empresaId);
  if (ticketIds.length === 0) {
    return { step: 'db:tickets_comentarios', ok: true, detail: '0 (sem tickets)' };
  }

  const { error, count } = await supabase
    .from('tickets_comentarios')
    .delete({ count: 'exact' })
    .in('ticket_id', ticketIds);

  if (error) {
    if (isIgnorableTableError(error)) {
      return { step: 'db:tickets_comentarios', ok: true, detail: 'tabela inexistente (ignorada)' };
    }
    return { step: 'db:tickets_comentarios', ok: false, detail: error.message };
  }
  return { step: 'db:tickets_comentarios', ok: true, detail: `${count ?? 0} linha(s)` };
}

async function deleteUserSideTables(
  supabase: SupabaseClient,
  usuarioIds: string[],
  authUserIds: string[]
): Promise<DeleteStep[]> {
  const steps: DeleteStep[] = [];

  if (usuarioIds.length > 0) {
    for (const table of ['codigo_verificacao', 'notificacoes_push'] as const) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .in('usuario_id', usuarioIds);
      if (error) {
        if (isIgnorableTableError(error)) {
          steps.push({ step: `db:${table}`, ok: true, detail: 'tabela inexistente (ignorada)' });
        } else {
          steps.push({ step: `db:${table}`, ok: true, detail: `ignorado: ${error.message}` });
        }
      } else {
        steps.push({ step: `db:${table}`, ok: true, detail: `${count ?? 0} linha(s)` });
      }
    }
  }

  if (authUserIds.length > 0) {
    const { error, count } = await supabase
      .from('push_tokens')
      .delete({ count: 'exact' })
      .in('auth_user_id', authUserIds);
    if (error) {
      if (isIgnorableTableError(error)) {
        steps.push({ step: 'db:push_tokens', ok: true, detail: 'tabela inexistente (ignorada)' });
      } else {
        steps.push({ step: 'db:push_tokens', ok: true, detail: `ignorado: ${error.message}` });
      }
    } else {
      steps.push({ step: 'db:push_tokens', ok: true, detail: `${count ?? 0} linha(s)` });
    }
  }

  return steps;
}

export function validateDeleteConfirmation(params: {
  empresaNome: string;
  confirmacaoNome: string;
  confirmacaoTexto: string;
}): { ok: true } | { ok: false; message: string } {
  const nomeEsperado = params.empresaNome.trim();
  const nomeInformado = (params.confirmacaoNome || '').trim();
  const frase = (params.confirmacaoTexto || '').trim();

  if (!nomeEsperado) {
    return { ok: false, message: 'Nome da empresa inválido' };
  }
  if (nomeInformado !== nomeEsperado) {
    return {
      ok: false,
      message: 'O nome digitado não confere com o da empresa. Digite o nome exatamente como aparece.',
    };
  }
  if (frase !== CONFIRM_PHRASE) {
    return {
      ok: false,
      message: `Digite exatamente: ${CONFIRM_PHRASE}`,
    };
  }
  return { ok: true };
}

export { CONFIRM_PHRASE };

/**
 * Exclui permanentemente uma empresa e todos os dados vinculados (DB + storage + Auth).
 * Usa service role. Filtra sempre por empresaId — nunca apaga dados de outras empresas.
 */
export async function deleteEmpresaPermanente(
  supabase: SupabaseClient,
  empresaId: string
): Promise<{ ok: true; steps: DeleteStep[] } | { ok: false; message: string; steps: DeleteStep[] }> {
  const steps: DeleteStep[] = [];

  if (!empresaId || typeof empresaId !== 'string') {
    return { ok: false, message: 'ID da empresa inválido', steps };
  }

  const uuidOk =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(empresaId);
  if (!uuidOk) {
    return { ok: false, message: 'ID da empresa inválido', steps };
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id, nome, logo_url')
    .eq('id', empresaId)
    .maybeSingle();

  if (empresaError || !empresa) {
    return { ok: false, message: 'Empresa não encontrada', steps };
  }

  // --- Coletar IDs antes de apagar ---
  const { data: usuariosRows } = await supabase
    .from('usuarios')
    .select('id, auth_user_id')
    .eq('empresa_id', empresaId);

  const usuarioIds = (usuariosRows || []).map((u) => u.id as string).filter(Boolean);
  const authUserIds = (usuariosRows || [])
    .map((u) => u.auth_user_id as string | null)
    .filter((id): id is string => Boolean(id));

  const ordemIds = await listIds(supabase, 'ordens_servico', empresaId);
  const contaIds = await listIds(supabase, 'contas_pagar', empresaId);

  // --- Storage (antes de perder IDs) ---
  const storageJobs: Array<{ bucket: string; prefix: string }> = [
    { bucket: 'produtos', prefix: `produtos/${empresaId}` },
    { bucket: 'catalogo', prefix: `empresa-${empresaId}` },
    { bucket: 'aparelhos', prefix: `empresa-${empresaId}` },
  ];

  for (const job of storageJobs) {
    const result = await removeStoragePrefix(supabase, job.bucket, job.prefix);
    steps.push({
      step: `storage:${job.bucket}/${job.prefix}`,
      ok: !result.error,
      detail: result.error || `${result.removed} arquivo(s)`,
    });
  }

  for (const ordemId of ordemIds) {
    const result = await removeStoragePrefix(supabase, 'ordens-imagens', ordemId);
    if (result.removed > 0 || result.error) {
      steps.push({
        step: `storage:ordens-imagens/${ordemId}`,
        ok: !result.error,
        detail: result.error || `${result.removed} arquivo(s)`,
      });
    }
  }

  for (const contaId of contaIds) {
    try {
      const { data, error } = await supabase.storage
        .from('anexos-contas')
        .list('', { search: `anexo_${contaId}_`, limit: 200 });
      if (!error && data?.length) {
        const paths = data.filter((f) => f.id && f.name).map((f) => f.name);
        if (paths.length) {
          const { error: remErr } = await supabase.storage.from('anexos-contas').remove(paths);
          steps.push({
            step: `storage:anexos-contas/${contaId}`,
            ok: !remErr,
            detail: remErr?.message || `${paths.length} arquivo(s)`,
          });
        }
      }
    } catch (err) {
      steps.push({
        step: `storage:anexos-contas/${contaId}`,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const logoPath = extractStoragePathFromPublicUrl(empresa.logo_url, 'logos');
  if (logoPath) {
    const { error } = await supabase.storage.from('logos').remove([logoPath]);
    steps.push({
      step: `storage:logos/${logoPath}`,
      ok: !error,
      detail: error?.message || '1 arquivo',
    });
  }

  for (const usuarioId of usuarioIds) {
    const result = await removeStoragePrefix(supabase, 'avatars', `user-${usuarioId}`);
    if (result.removed > 0 || result.error) {
      steps.push({
        step: `storage:avatars/user-${usuarioId}`,
        ok: !result.error,
        detail: result.error || `${result.removed} arquivo(s)`,
      });
    }
  }

  // --- WhatsApp helper ---
  try {
    await clearEmpresaWhatsAppData(supabase, empresaId);
    steps.push({ step: 'whatsapp:clearEmpresaWhatsAppData', ok: true });
  } catch (err) {
    steps.push({
      step: 'whatsapp:clearEmpresaWhatsAppData',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // --- Itens de orçamento (sem empresa_id; via cabeçalho) ---
  {
    const orcIds = await listIds(supabase, 'orcamentos_emitidos', empresaId);
    if (orcIds.length > 0) {
      const { error, count } = await supabase
        .from('orcamentos_emitidos_itens')
        .delete({ count: 'exact' })
        .in('orcamento_id', orcIds);
      if (error && !isIgnorableTableError(error)) {
        steps.push({ step: 'db:orcamentos_emitidos_itens', ok: false, detail: error.message });
      } else {
        steps.push({
          step: 'db:orcamentos_emitidos_itens',
          ok: true,
          detail: isIgnorableTableError(error) ? 'tabela inexistente (ignorada)' : `${count ?? 0} linha(s)`,
        });
      }
    } else {
      steps.push({ step: 'db:orcamentos_emitidos_itens', ok: true, detail: '0 (sem orçamentos)' });
    }
  }

  // --- Históricos ligados à OS (podem não ter empresa_id) ---
  if (ordemIds.length > 0) {
    for (const [table, column] of [
      ['status_historico', 'os_id'],
      ['status_historico', 'ordem_servico_id'],
      ['os_historico', 'os_id'],
      ['os_historico', 'ordem_servico_id'],
      ['comissoes_historico', 'ordem_servico_id'],
    ] as const) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .in(column, ordemIds);
      if (error) {
        if (isIgnorableTableError(error) || error.message?.toLowerCase().includes('column')) {
          continue;
        }
        steps.push({ step: `db:${table} by ${column}`, ok: false, detail: error.message });
      } else {
        steps.push({
          step: `db:${table} by ${column}`,
          ok: true,
          detail: `${count ?? 0} linha(s)`,
        });
      }
    }
  }

  // --- Comentários de tickets (antes dos tickets) ---
  steps.push(await deleteTicketsComentarios(supabase, empresaId));

  // --- Tabelas com empresa_id (continua mesmo se alguma falhar; retry no fim) ---
  const failedTables: string[] = [];
  for (const table of TABLES_WITH_EMPRESA_ID) {
    const step = await deleteByEmpresaId(supabase, table, empresaId);
    steps.push(step);
    if (!step.ok) failedTables.push(table);
  }

  // Segunda passagem nas que falharam (ordem FK pode ter desbloqueado)
  for (const table of [...failedTables]) {
    const step = await deleteByEmpresaId(supabase, table, empresaId);
    steps.push({ ...step, step: `db:${table}:retry` });
    if (step.ok) {
      const idx = failedTables.indexOf(table);
      if (idx >= 0) failedTables.splice(idx, 1);
    }
  }

  if (failedTables.length > 0) {
    return {
      ok: false,
      message: `Não foi possível limpar todas as tabelas vinculadas: ${failedTables.join(', ')}. A exclusão da empresa foi interrompida para evitar inconsistência. Revise os passos e tente novamente.`,
      steps,
    };
  }

  // --- Dados ligados a usuários ---
  steps.push(...(await deleteUserSideTables(supabase, usuarioIds, authUserIds)));

  // --- Usuarios (tabela) ---
  {
    const { error, count } = await supabase
      .from('usuarios')
      .delete({ count: 'exact' })
      .eq('empresa_id', empresaId);
    if (error) {
      return {
        ok: false,
        message: `Falha ao excluir usuários: ${error.message}`,
        steps: [...steps, { step: 'db:usuarios', ok: false, detail: error.message }],
      };
    }
    steps.push({ step: 'db:usuarios', ok: true, detail: `${count ?? 0} linha(s)` });
  }

  // --- Auth users ---
  for (const authId of authUserIds) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(authId);
      steps.push({
        step: `auth:deleteUser/${authId}`,
        ok: !error,
        detail: error?.message || 'ok',
      });
    } catch (err) {
      steps.push({
        step: `auth:deleteUser/${authId}`,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // --- Empresa (somente este id) ---
  {
    const { error, count } = await supabase
      .from('empresas')
      .delete({ count: 'exact' })
      .eq('id', empresaId);
    if (error) {
      return {
        ok: false,
        message: `Dados vinculados removidos, mas falha ao excluir a empresa: ${error.message}`,
        steps: [...steps, { step: 'db:empresas', ok: false, detail: error.message }],
      };
    }
    if (!count || count < 1) {
      return {
        ok: false,
        message: 'Nenhuma empresa foi excluída. Verifique o ID.',
        steps: [...steps, { step: 'db:empresas', ok: false, detail: '0 linhas' }],
      };
    }
    steps.push({ step: 'db:empresas', ok: true, detail: '1 linha' });
  }

  return { ok: true, steps };
}
