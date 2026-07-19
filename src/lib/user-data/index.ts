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
    
    // Normalizar WhatsApp (remover tudo que não é número)
    const normalizedWhatsApp = whatsapp.replace(/\D/g, '');
    
    console.log('🔍 Buscando usuário:', {
      whatsappOriginal: whatsapp,
      whatsappNormalizado: normalizedWhatsApp
    });
    
    // Buscar todos os usuários e comparar os números normalizados
    // porque o campo whatsapp pode estar formatado no banco
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nome, nivel, tambem_tecnico, whatsapp, auth_user_id, empresa_id');
    
    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return null;
    }
    
    // Encontrar o usuário comparando números normalizados
    // Tenta várias variações porque o WhatsApp pode enviar com/sem código do país
    const usuario = usuarios?.find(u => {
      if (!u.whatsapp) return false;
      
      const dbWhatsAppNormalized = u.whatsapp.replace(/\D/g, '');
      const buscado = normalizedWhatsApp;
      
      // Remover código do país se existir (55 do Brasil)
      const dbSem55 = dbWhatsAppNormalized.replace(/^55/, '');
      const buscadoSem55 = buscado.replace(/^55/, '');
      
      // Comparar em várias combinações
      const match = 
        // Exatamente igual
        dbWhatsAppNormalized === buscado ||
        // Ambos sem 55
        dbSem55 === buscadoSem55 ||
        // DB sem 55, buscado com 55
        dbWhatsAppNormalized === buscadoSem55 ||
        // DB com 55, buscado sem 55
        dbSem55 === buscado ||
        // DB com 55, buscado com 55
        `55${dbWhatsAppNormalized}` === buscado ||
        // DB sem 55, buscado tem 55 no início
        `55${dbSem55}` === buscado;
      
      if (match) {
        console.log('✅ Match encontrado:', {
          dbOriginal: u.whatsapp,
          dbNormalizado: dbWhatsAppNormalized,
          buscado: buscado
        });
      }
      
      return match;
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado para WhatsApp:', {
        buscado: normalizedWhatsApp,
        totalUsuarios: usuarios?.length || 0
      });
      return null;
    }
    
    // Normalizar nivel para lowercase
    if (usuario.nivel) {
      usuario.nivel = usuario.nivel.toLowerCase() as NivelUsuario;
    }
    
    console.log('✅ Usuário encontrado:', {
      nome: usuario.nome,
      nivel: usuario.nivel,
      whatsappBanco: usuario.whatsapp,
      whatsappBuscado: normalizedWhatsApp,
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

