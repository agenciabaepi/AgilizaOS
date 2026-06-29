/** Tipos do CRM WhatsApp — Cloud API (Meta) */

export type WhatsAppConversaStatus = 'aberta' | 'fechada' | 'arquivada';

export type WhatsAppMensagemDirecao = 'entrada' | 'saida';

export type WhatsAppMensagemTipo =
  | 'texto'
  | 'template'
  | 'imagem'
  | 'documento'
  | 'audio'
  | 'video'
  | 'nota_interna'
  | 'sistema';

export type WhatsAppAutomacaoEvento =
  | 'os_criada'
  | 'os_status_alterado'
  | 'os_aprovada'
  | 'os_concluida'
  | 'os_entregue'
  | 'os_orcamento_enviado'
  | 'os_aguardando_peca'
  | 'pagamento_confirmado'
  | 'nota_fiscal_emitida';

export interface WhatsAppEmpresaConfig {
  id: string;
  empresa_id: string;
  phone_number_id: string | null;
  business_account_id: string | null;
  waba_id: string | null;
  meta_business_id: string | null;
  display_phone_number: string | null;
  access_token: string | null;
  webhook_verified: boolean;
  ativo: boolean;
  connection_mode: 'cloud_api' | 'coexistence' | null;
  is_on_biz_app: boolean;
  embedded_signup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversa {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  os_id: string | null;
  wa_id: string;
  telefone: string;
  nome_contato: string | null;
  status: WhatsAppConversaStatus;
  ultima_mensagem_preview: string | null;
  ultima_mensagem_em: string | null;
  nao_lidas: number;
  atribuido_usuario_id: string | null;
  created_at: string;
  updated_at: string;
  /** Joins opcionais */
  clientes?: { id: string; nome: string; telefone?: string; celular?: string; email?: string; documento?: string; observacoes?: string } | null;
  ordens_servico?: { id: string; numero_os: number; status: string; equipamento?: string; marca?: string; modelo?: string } | null;
  usuarios?: { id: string; nome: string; nivel?: string } | null;
}

export interface WhatsAppAtendente {
  id: string;
  nome: string;
  nivel: string | null;
}

export interface WhatsAppOrdemResumo {
  id: string;
  numero_os: number;
  status: string | null;
  status_tecnico: string | null;
  equipamento: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  valor_faturado: number | null;
  valor_servico: number | null;
  valor_peca: number | null;
  created_at: string;
  data_entrega: string | null;
}

export interface WhatsAppMensagem {
  id: string;
  conversa_id: string;
  empresa_id: string;
  direcao: WhatsAppMensagemDirecao;
  tipo: WhatsAppMensagemTipo;
  conteudo: string;
  meta_message_id: string | null;
  status_entrega: 'enviada' | 'entregue' | 'lida' | 'falha' | null;
  erro_entrega: string | null;
  os_id: string | null;
  automacao_id: string | null;
  enviado_por_usuario_id: string | null;
  created_at: string;
}

export interface WhatsAppConversaNota {
  id: string;
  conversa_id: string;
  empresa_id: string;
  conteudo: string;
  autor_usuario_id: string | null;
  autor_nome: string | null;
  created_at: string;
}

export interface WhatsAppOsContexto {
  id: string;
  conversa_id: string;
  os_id: string;
  empresa_id: string;
  status_os: string | null;
  status_tecnico: string | null;
  finalizado: boolean;
  finalizado_em: string | null;
  pago: boolean;
  pago_em: string | null;
  nota_fiscal_emitida: boolean;
  nota_fiscal_numero: string | null;
  nota_fiscal_emitida_em: string | null;
  valor_faturado: number | null;
  updated_at: string;
}

export interface WhatsAppAutomacao {
  id: string;
  empresa_id: string;
  nome: string;
  evento: WhatsAppAutomacaoEvento;
  status_trigger: string | null;
  mensagem_template: string;
  usar_template_meta: boolean;
  meta_template_name: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/** Variáveis disponíveis em templates de automação */
export interface AutomacaoTemplateVars {
  cliente_nome?: string;
  numero_os?: string | number;
  status?: string;
  equipamento?: string;
  marca?: string;
  modelo?: string;
  valor?: string;
  empresa_nome?: string;
  link_os?: string;
}

export interface DispatchAutomacaoPayload {
  empresa_id: string;
  evento: WhatsAppAutomacaoEvento;
  os_id: string;
  status_anterior?: string;
  status_novo?: string;
}
