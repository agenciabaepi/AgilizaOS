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
    
    // Normalizar nivel para lowercase
    if (usuario.nivel) {
      usuario.nivel = usuario.nivel.toLowerCase() as NivelUsuario;
    }
    
    console.log('✅ Usuário encontrado:', {
      nome: usuario.nome,
      nivel: usuario.nivel,
      nivelOriginal: usuario.nivel,
      empresa_id: usuario.empresa_id
    });
    
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
    // Normalizar o nível (caso não tenha sido normalizado antes)
    const nivelStr = usuario.nivel?.toLowerCase() || '';
    
    console.log(`📊 Buscando dados para nível "${nivelStr}":`, {
      nome: usuario.nome,
      nivelOriginal: usuario.nivel,
      nivelNormalizado: nivelStr
    });
    
    // Mapear variações de nome para o nível correto
    let nivelFinal: NivelUsuario;
    if (nivelStr === 'administrador' || nivelStr === 'administrator') {
      nivelFinal = 'admin';
      console.log('🔄 Convertendo "administrador" para "admin"');
    } else {
      nivelFinal = nivelStr as NivelUsuario;
    }
    
    switch (nivelFinal) {
      case 'tecnico':
        console.log('👨‍🔧 Processando como TÉCNICO');
        const dadosTecnico = await getTecnicoDataForContext(usuario.id);
        if (!dadosTecnico) return null;
        return {
          nivel: 'tecnico',
          dados: dadosTecnico
        };
      
      case 'financeiro':
        console.log('💼 Processando como FINANCEIRO');
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
        console.log('👥 Processando como ATENDENTE');
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
        console.log('👨‍💼 Processando como ADMIN');
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
        console.error('❌ Nível de usuário desconhecido:', {
          nivel: usuario.nivel,
          nivelNormalizado: nivelStr,
          nivelFinal
        });
        return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do usuário:', error);
    return null;
  }
}

// Exportar tipos
export * from './types';

