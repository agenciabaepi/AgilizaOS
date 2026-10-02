/**
 * Templates aprovados no WhatsApp Manager (Meta).
 * A ordem dos parâmetros precisa ser idêntica à do modelo cadastrado na Meta.
 */

/** Base da URL dinâmica cadastrada nos botões dos templates (o parâmetro é só o sufixo) */
export const META_TEMPLATE_URL_BASE = 'https://gestaoconsert.com.br/';

export interface MetaTemplateOsData {
  id: string;
  numero_os: string | number;
  cliente_nome: string;
  equipamento: string;
  marca: string;
  modelo: string;
  status: string;
  status_tecnico: string;
}

export interface MetaTemplateBuild {
  templateName: string;
  languageCode: string;
  bodyParams: string[];
  urlButtons: { index: number; param: string }[];
  /** Texto equivalente ao que o cliente recebe, para registrar no inbox do CRM */
  preview: string;
}

interface MetaTemplateDefinition {
  languageCode: string;
  build: (os: MetaTemplateOsData) => Omit<MetaTemplateBuild, 'templateName' | 'languageCode'>;
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function primeiroNome(nome: string): string {
  return toTitleCase(nome.trim().split(/\s+/)[0] || 'Cliente');
}

function buildNovaOs(os: MetaTemplateOsData): Omit<MetaTemplateBuild, 'templateName' | 'languageCode'> {
  const nome = primeiroNome(os.cliente_nome);
  const numero = `Nº ${os.numero_os}`;
  const aparelho = [os.equipamento, os.marca, os.modelo].filter(Boolean).join(' ').trim() || '-';
  const status = toTitleCase(os.status_tecnico || os.status || 'Aguardando Início');
  const linkPath = `os/${os.id}/status`;

  return {
    bodyParams: [nome, numero, aparelho, status],
    urlButtons: [{ index: 0, param: linkPath }],
    preview: [
      '*ORDEM DE SERVIÇO*',
      '',
      `Olá ${nome},`,
      '',
      `Sua ordem de serviço *${numero}* foi criada.`,
      '',
      `Aparelho: ${aparelho}`,
      `Status: *${status}*`,
      '',
      'Em breve entraremos em contato com atualizações.',
      '',
      `Acompanhar status online: ${META_TEMPLATE_URL_BASE}${linkPath}`,
    ].join('\n'),
  };
}

const TEMPLATES: Record<string, MetaTemplateDefinition> = {
  nova_os: { languageCode: 'pt_BR', build: buildNovaOs },
  /** Mesmo conteúdo do nova_os, com o PDF da O.S. no cabeçalho */
  nova_os_pdf: { languageCode: 'pt_BR', build: buildNovaOs },
};

/** Versão do template que leva o PDF da O.S. anexado no cabeçalho */
const PDF_VARIANTS: Record<string, string> = {
  nova_os: 'nova_os_pdf',
};

export function templateComPdf(templateName: string): string | null {
  return PDF_VARIANTS[templateName] ?? null;
}

export function buildMetaTemplate(
  templateName: string,
  os: MetaTemplateOsData
): MetaTemplateBuild | null {
  const def = TEMPLATES[templateName];
  if (!def) return null;
  return { templateName, languageCode: def.languageCode, ...def.build(os) };
}

const NOVA_OS_BODY = {
  type: 'BODY',
  text: 'Olá {{1}}, \n\nSua ordem de serviço *{{2}}* foi criada.\n\nAparelho: {{3}}\nStatus: *{{4}}*\n\nEm breve entraremos em contato com atualizações.',
  example: {
    body_text: [['Lucas', 'Nº 11897', 'CELULAR APPLE IPHONE 15 PRO MAX', 'Aguardando Início']],
  },
};

const NOVA_OS_BUTTONS = {
  type: 'BUTTONS',
  buttons: [
    {
      type: 'URL',
      text: 'Acompanhar status online',
      url: `${META_TEMPLATE_URL_BASE}{{1}}`,
      example: [`${META_TEMPLATE_URL_BASE}os/fd37bd36-a559-4625-8126-c69b2c4520d2/status`],
    },
  ],
};

interface TemplateCreateDefinition {
  language: string;
  /** Header de documento exige um PDF de exemplo enviado à Meta (header_handle) */
  documentHeader?: boolean;
  components: (headerHandle?: string) => Record<string, unknown>[];
}

/**
 * Definições para criar os templates na conta WhatsApp Business de cada loja.
 * Templates são por WABA: os aprovados na conta da Gestão Consert não existem nas contas dos clientes.
 */
const TEMPLATE_CREATE_DEFINITIONS: Record<string, TemplateCreateDefinition> = {
  nova_os: {
    language: 'pt_BR',
    components: () => [
      { type: 'HEADER', format: 'TEXT', text: 'ORDEM DE SERVIÇO' },
      NOVA_OS_BODY,
      { type: 'FOOTER', text: 'Acesse imagens de entrada do aparelho, termos e checklist ↓' },
      NOVA_OS_BUTTONS,
    ],
  },
  nova_os_pdf: {
    language: 'pt_BR',
    documentHeader: true,
    components: (headerHandle) => [
      { type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [headerHandle] } },
      NOVA_OS_BODY,
      { type: 'FOOTER', text: 'Ordem de serviço em PDF anexada ↑' },
      NOVA_OS_BUTTONS,
    ],
  },
};

/** Sobe um PDF de exemplo pela Resumable Upload API e devolve o handle exigido na criação do template */
async function uploadTemplateSamplePdf(accessToken: string, graphBase: string): Promise<string> {
  const appId = process.env.WHATSAPP_APP_ID || process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  if (!appId) throw new Error('WHATSAPP_APP_ID não configurado');

  const { generateOSPDF } = await import('@/lib/pdfOS');
  const buffer = await generateOSPDF({
    numero_os: 11897,
    created_at: new Date().toISOString(),
    empresa_nome: 'Assistência Exemplo',
    equipamento: 'CELULAR',
    marca: 'APPLE',
    modelo: 'IPHONE 15 PRO MAX',
    problema_relatado: 'Tela quebrada',
    status: 'ABERTA',
    clientes: { nome: 'Lucas', telefone: '', email: '' },
  });

  const sessionUrl = new URL(`${graphBase}/${appId}/uploads`);
  sessionUrl.searchParams.set('file_name', 'OS-11897.pdf');
  sessionUrl.searchParams.set('file_length', String(buffer.length));
  sessionUrl.searchParams.set('file_type', 'application/pdf');
  sessionUrl.searchParams.set('access_token', accessToken);
  const sessionRes = await fetch(sessionUrl.toString(), { method: 'POST' });
  const session = await sessionRes.json();
  if (!sessionRes.ok || !session?.id) {
    throw new Error(session?.error?.message || 'Falha ao iniciar upload do PDF de exemplo');
  }

  const uploadRes = await fetch(`${graphBase}/${session.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${accessToken}`, file_offset: '0' },
    body: new Uint8Array(buffer),
  });
  const upload = await uploadRes.json();
  if (!uploadRes.ok || !upload?.h) {
    throw new Error(upload?.error?.message || 'Falha ao enviar PDF de exemplo');
  }
  return upload.h as string;
}

/** Erros da Meta que indicam template ausente, não aprovado, pausado ou desativado na WABA */
export function isTemplateIndisponivelError(error: string | undefined | null): boolean {
  return !!error && /#13200[01]|#13201[56]/.test(error);
}

/** Cria na WABA os templates do Consert que ainda não existem (ficam pendentes até a Meta aprovar). */
export async function ensureMetaTemplatesOnWaba(
  wabaId: string,
  accessToken: string,
  graphBase = 'https://graph.facebook.com/v21.0'
): Promise<{ created: string[]; errors: string[] }> {
  const created: string[] = [];
  const errors: string[] = [];

  const listRes = await fetch(`${graphBase}/${wabaId}/message_templates?fields=name,language&limit=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok) {
    return { created, errors: [listData?.error?.message || 'Falha ao listar templates'] };
  }
  const existentes = new Set(
    ((listData?.data ?? []) as { name: string; language: string }[]).map((t) => `${t.name}:${t.language}`)
  );

  for (const [name, def] of Object.entries(TEMPLATE_CREATE_DEFINITIONS)) {
    if (existentes.has(`${name}:${def.language}`)) continue;

    let headerHandle: string | undefined;
    if (def.documentHeader) {
      try {
        headerHandle = await uploadTemplateSamplePdf(accessToken, graphBase);
      } catch (e) {
        errors.push(`${name}: ${e instanceof Error ? e.message : 'falha no PDF de exemplo'}`);
        continue;
      }
    }

    const res = await fetch(`${graphBase}/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        language: def.language,
        category: 'UTILITY',
        parameter_format: 'POSITIONAL',
        components: def.components(headerHandle),
      }),
    });
    const data = await res.json();
    if (res.ok) created.push(name);
    else errors.push(`${name}: ${data?.error?.error_user_msg || data?.error?.message || res.status}`);
  }

  return { created, errors };
}
