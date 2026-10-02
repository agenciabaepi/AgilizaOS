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

const TEMPLATES: Record<string, MetaTemplateDefinition> = {
  nova_os: {
    languageCode: 'pt_BR',
    build: (os) => {
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
    },
  },
};

export function buildMetaTemplate(
  templateName: string,
  os: MetaTemplateOsData
): MetaTemplateBuild | null {
  const def = TEMPLATES[templateName];
  if (!def) return null;
  return { templateName, languageCode: def.languageCode, ...def.build(os) };
}

/**
 * Definições para criar os templates na conta WhatsApp Business de cada loja.
 * Templates são por WABA: os aprovados na conta da Gestão Consert não existem nas contas dos clientes.
 */
const TEMPLATE_CREATE_PAYLOADS: Record<string, Record<string, unknown>> = {
  nova_os: {
    name: 'nova_os',
    language: 'pt_BR',
    category: 'UTILITY',
    parameter_format: 'POSITIONAL',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'ORDEM DE SERVIÇO' },
      {
        type: 'BODY',
        text: 'Olá {{1}}, \n\nSua ordem de serviço *{{2}}* foi criada.\n\nAparelho: {{3}}\nStatus: *{{4}}*\n\nEm breve entraremos em contato com atualizações.',
        example: {
          body_text: [['Lucas', 'Nº 11897', 'CELULAR APPLE IPHONE 15 PRO MAX', 'Aguardando Início']],
        },
      },
      { type: 'FOOTER', text: 'Acesse imagens de entrada do aparelho, termos e checklist ↓' },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Acompanhar status online',
            url: `${META_TEMPLATE_URL_BASE}{{1}}`,
            example: [`${META_TEMPLATE_URL_BASE}os/fd37bd36-a559-4625-8126-c69b2c4520d2/status`],
          },
        ],
      },
    ],
  },
};

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

  for (const [name, payload] of Object.entries(TEMPLATE_CREATE_PAYLOADS)) {
    if (existentes.has(`${name}:${payload.language}`)) continue;
    const res = await fetch(`${graphBase}/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) created.push(name);
    else errors.push(`${name}: ${data?.error?.error_user_msg || data?.error?.message || res.status}`);
  }

  return { created, errors };
}
