'use client';

import { View, Text } from '@react-pdf/renderer';

export interface ChecklistItem {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  ativo: boolean;
  ordem: number;
  obrigatorio: boolean;
}

export interface ChecklistRendererProps {
  checklistData: string | null;
  checklistItens?: ChecklistItem[];
  equipamentoCategoria?: string;
  styles: any;
  mode?: 'pdf' | 'viewer' | 'simple';
}

export function ChecklistRenderer({ 
  checklistData, 
  checklistItens = [], 
  equipamentoCategoria, 
  styles,
  mode = 'viewer'
}: ChecklistRendererProps) {
  if (!checklistData || checklistData === '{}' || checklistData === 'null') {
    return null;
  }

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga === true) {
      return renderAparelhoNaoLiga(styles, mode);
    }

    // Processar itens do checklist
    const { itensAprovados, itensReprovados } = processChecklistItems(checklist, checklistItens);
    
    console.log(`🚨 ChecklistRenderer (${mode}) - Resultado:`, {
      total_itens: itensAprovados.length + itensReprovados.length,
      aprovados: itensAprovados.length,
      reprovados: itensReprovados.length
    });

    // Se não há itens para mostrar, não renderizar nada
    if (itensAprovados.length === 0 && itensReprovados.length === 0) {
      console.log(`❌ ChecklistRenderer (${mode}) - Nenhum item para exibir`);
      return null;
    }

    return renderChecklistItems(itensAprovados, itensReprovados, styles, mode);

  } catch (error) {
    console.error(`❌ ChecklistRenderer (${mode}) - Erro ao processar:`, error);
    return null;
  }
}

function renderAparelhoNaoLiga(styles: any, mode: string) {
  const fontSize = mode === 'simple' ? 8 : 9;
  
  return (
    <View style={styles.block} break={false}>
      <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Checklist de Entrada</Text>
      
      <View style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 2,
        padding: 6,
        backgroundColor: '#f9fafb'
      }}>
        <Text style={[styles.paragraph, { 
          fontSize: fontSize, 
          color: '#6b7280', 
          marginBottom: 0,
          fontStyle: 'italic'
        }]}>
          O aparelho não liga, portanto o checklist não pôde ser realizado. Após o reparo, será realizado o teste completo das funcionalidades.
        </Text>
      </View>
    </View>
  );
}

function processChecklistItems(checklist: any, checklistItens: ChecklistItem[]) {
  const itensAprovados: ChecklistItem[] = [];
  const itensReprovados: ChecklistItem[] = [];

  // Se temos itens específicos da categoria, usar eles
  if (checklistItens.length > 0) {
    console.log('🚨 Usando itens da categoria específica');
    
    checklistItens.forEach(item => {
      const itemValue = checklist[item.id];
      if (itemValue === true) {
        itensAprovados.push(item);
      } else {
        // Itens não marcados (undefined) ou marcados como false são considerados reprovados
        itensReprovados.push(item);
      }
    });
  } else {
    // Caso contrário, processar todos os itens salvos
    console.log('🚨 Processando todos os itens salvos');
    
    Object.keys(checklist).forEach(key => {
      if (key === 'aparelhoNaoLiga') return;
      
      const value = checklist[key];
      const item: ChecklistItem = {
        id: key,
        nome: key,
        descricao: '',
        categoria: 'Geral',
        ativo: true,
        ordem: 0,
        obrigatorio: false
      };
      
      if (value === true) {
        itensAprovados.push(item);
      } else {
        // Itens não marcados (undefined) ou marcados como false são considerados reprovados
        itensReprovados.push(item);
      }
    });
  }

  return { itensAprovados, itensReprovados };
}

function renderChecklistItems(itensAprovados: ChecklistItem[], itensReprovados: ChecklistItem[], styles: any, mode: string) {
  const fontSize = mode === 'simple' ? 8 : 9;
  const titleFontSize = mode === 'simple' ? 9 : 10;
  
  return (
    <View style={styles.block} break={false} minPresenceAhead={80}>
      <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Checklist de Entrada</Text>

      <View style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 2,
        padding: 6,
        backgroundColor: '#ffffff'
      }}>
        
        {/* Itens Aprovados */}
        {itensAprovados.length > 0 && (
          <View style={{ marginBottom: itensReprovados.length > 0 ? 6 : 0 }} break={false}>
            <Text style={[styles.paragraph, { 
              fontSize: titleFontSize, 
              fontWeight: 'bold', 
              color: '#059669',
              marginBottom: 3
            }]}>
              ✓ Funcionalidades Operacionais ({itensAprovados.length})
            </Text>
            
            {itensAprovados.map((item, index) => (
              <Text key={index} style={[styles.paragraph, { 
                fontSize, 
                color: '#374151', 
                marginBottom: index < itensAprovados.length - 1 ? 1 : 0,
                paddingLeft: 8
              }]}>
                • {item.nome}
              </Text>
            ))}
          </View>
        )}

        {/* Itens Reprovados */}
        {itensReprovados.length > 0 && (
          <View break={false}>
            {itensAprovados.length > 0 && (
              <View style={{
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
                marginTop: 4,
                marginBottom: 4,
                paddingTop: 4
              }} />
            )}
            
            <Text style={[styles.paragraph, { 
              fontSize: titleFontSize, 
              fontWeight: 'bold', 
              color: '#dc2626',
              marginBottom: 3
            }]}>
              ✗ Funcionalidades com Problemas ({itensReprovados.length})
            </Text>
            
            {itensReprovados.map((item, index) => (
              <Text key={index} style={[styles.paragraph, { 
                fontSize, 
                color: '#374151', 
                marginBottom: index < itensReprovados.length - 1 ? 1 : 0,
                paddingLeft: 8
              }]}>
                • {item.nome}
              </Text>
            ))}
          </View>
        )}

      </View>
    </View>
  );
}

export default ChecklistRenderer;