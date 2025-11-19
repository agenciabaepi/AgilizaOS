/**
 * Tipos de dados para diferentes níveis de usuário
 */

// Níveis de usuário do sistema
export type NivelUsuario = 'tecnico' | 'atendente' | 'financeiro' | 'admin';

// Interface base do usuário
export interface Usuario {
  id: string;
  nome: string;
  nivel: NivelUsuario;
  whatsapp?: string;
  auth_user_id?: string;
  empresa_id?: string;
}

// Dados para Técnico
export interface DadosTecnico {
  comissoes?: {
    total: number;
    totalPago: number;
    totalPendente: number;
    ultimas: Array<{
      numero_os: number;
      cliente: string;
      valor: number;
      status: string;
      data: string;
    }>;
  };
  osPendentes?: Array<{
    numero_os: number;
    cliente: string;
    servico: string;
    status: string;
    status_tecnico: string;
  }>;
  osRecentes?: Array<{
    numero_os: number;
    cliente: string;
    status: string;
    status_tecnico: string;
  }>;
  contagemStatus?: Record<string, number>;
  totalOSPendentes?: number;
  totalOS?: number;
}

// Dados para Financeiro
export interface DadosFinanceiro {
  contasAPagar?: {
    total: number;
    pendentes: number;
    pagas: number;
    vencidas: number;
    valorTotal: number;
    valorPendente: number;
    valorPago: number;
    valorVencido: number;
    proximasVencer: Array<{
      descricao: string;
      valor: number;
      vencimento: string;
      fornecedor?: string;
    }>;
  };
  resumoMensal?: {
    receita: number;
    despesas: number;
    lucro: number;
  };
}

// Dados para Atendente
export interface DadosAtendente {
  osAbertas?: {
    total: number;
    aguardandoAprovacao: number;
    emAndamento: number;
    ultimas: Array<{
      numero_os: number;
      cliente: string;
      status: string;
      tecnico?: string;
    }>;
  };
  clientesRecentes?: Array<{
    nome: string;
    telefone?: string;
    ultimaOS?: number;
  }>;
}

// Dados para Admin
export interface DadosAdmin {
  resumoGeral?: {
    totalOS: number;
    osAbertas: number;
    osFechadas: number;
    totalTecnicos: number;
    totalClientes: number;
  };
  financeiro?: {
    receitaMes: number;
    despesasMes: number;
    lucroMes: number;
    contasVencidas: number;
    valorVencido: number;
  };
  osUrgentes?: Array<{
    numero_os: number;
    cliente: string;
    status: string;
    diasAberta: number;
  }>;
}

// União de todos os tipos de dados possíveis
export type DadosUsuario = 
  | { nivel: 'tecnico'; dados: DadosTecnico }
  | { nivel: 'atendente'; dados: DadosAtendente }
  | { nivel: 'financeiro'; dados: DadosFinanceiro }
  | { nivel: 'admin'; dados: DadosAdmin };

