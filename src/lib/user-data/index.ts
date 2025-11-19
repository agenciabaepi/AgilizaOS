/**
 * Gerenciador central de dados de usuários por nível
 */
import { createAdminClient } from '../supabaseClient';
import { getTecnicoDataForContext } from '../tecnico-data';
import { getFinanceiroData } from './financeiro-data';
import { getAtendenteData } from './atendente-data';
import { getAdminData } from './admin-data';
import type { Usuario, DadosUsuario, NivelUsuario } from './types';

/**
 * Busca informações do usuário pelo WhatsApp
 */
export async function getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
  try {
    const supabase = createAdminClient();
    
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, nivel, whatsapp, auth_user_id, empresa_id')
      .eq('whatsapp', whatsapp)
      .maybeSingle();
    
    if (error || !usuario) {
      console.log('❌ Usuário não encontrado para WhatsApp:', whatsapp);
      return null;
    }
    
    return usuario as Usuario;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Busca dados específicos baseado no nível do usuário
 */
export async function getUserDataByLevel(usuario: Usuario): Promise<DadosUsuario | null> {
  try {
    console.log(`📊 Buscando dados para ${usuario.nivel}:`, usuario.nome);
    
    switch (usuario.nivel) {
      case 'tecnico':
        const dadosTecnico = await getTecnicoDataForContext(usuario.id);
        if (!dadosTecnico) return null;
        return {
          nivel: 'tecnico',
          dados: dadosTecnico
        };
      
      case 'financeiro':
        if (!usuario.empresa_id) {
          console.error('❌ Usuário financeiro sem empresa_id');
          return null;
        }
        const dadosFinanceiro = await getFinanceiroData(usuario.empresa_id);
        if (!dadosFinanceiro) return null;
        return {
          nivel: 'financeiro',
          dados: dadosFinanceiro
        };
      
      case 'atendente':
        if (!usuario.empresa_id) {
          console.error('❌ Atendente sem empresa_id');
          return null;
        }
        const dadosAtendente = await getAtendenteData(usuario.empresa_id);
        if (!dadosAtendente) return null;
        return {
          nivel: 'atendente',
          dados: dadosAtendente
        };
      
      case 'admin':
        if (!usuario.empresa_id) {
          console.error('❌ Admin sem empresa_id');
          return null;
        }
        const dadosAdmin = await getAdminData(usuario.empresa_id);
        if (!dadosAdmin) return null;
        return {
          nivel: 'admin',
          dados: dadosAdmin
        };
      
      default:
        console.error('❌ Nível de usuário desconhecido:', usuario.nivel);
        return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do usuário:', error);
    return null;
  }
}

// Exportar tipos
export * from './types';

