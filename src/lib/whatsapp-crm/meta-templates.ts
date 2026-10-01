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
