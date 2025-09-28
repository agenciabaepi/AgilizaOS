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
  const titleFontSize = mode === 'simple' ? 9 : 10;
  
  return (
    <View style={styles.block}>
      <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Checklist de Entrada</Text>
      
      <View style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
        padding: 8,
        backgroundColor: '#fafafa'
      }}>
        
        <View style={{
          backgroundColor: '#fef2f2',
          borderWidth: 1,
          borderColor: '#fecaca',
          borderRadius: 3,
          padding: 6,
          marginBottom: 6
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#dc2626',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 6
            }}>
              <Text style={{ fontSize: 8, color: '#ffffff', fontWeight: 'bold' }}>!</Text>
            </View>
            <Text style={[styles.paragraph, { 
              fontSize: titleFontSize, 
              fontWeight: 'bold', 
              color: '#dc2626', 
              marginBottom: 0
            }]}>
              ⚠️ Aparelho não liga
            </Text>
          </View>
        </View>

        <View style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#fed7d7',
          borderRadius: 3,
          padding: 8
        }}>
          <Text style={[styles.paragraph, { 
            fontSize: fontSize, 
            color: '#991b1b', 
            marginBottom: 6,
            textAlign: 'center',
            fontWeight: 'bold'
          }]}>
            Checklist não realizado
          </Text>
          
          <Text style={[styles.paragraph, { 
            fontSize: fontSize - 1, 
            color: '#7f1d1d', 
            marginBottom: 0,
            lineHeight: fontSize + 1
          }]}>
            Como o aparelho não liga, não é possível realizar o checklist para verificar quais funcionalidades estão operacionais. 
            Após o técnico conseguir fazer o aparelho ligar (caso tenha conserto), será realizado o checklist completo para 
            identificar quais componentes estão ou não funcionando.
          </Text>
        </View>

        <View style={{
          backgroundColor: '#f1f5f9',
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 3,
          padding: 6,
          marginTop: 6,
          alignItems: 'center'
        }}>
          <Text style={[styles.paragraph, { 
            fontSize: fontSize, 
            color: '#475569', 
            marginBottom: 0, 
            fontWeight: 'bold'
          }]}>
            🔧 Status: Aguardando reparo para teste completo
          </Text>
        </View>
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
  const fontSize = mode === 'simple' ? 7 : 8;
  const iconSize = mode === 'simple' ? 5 : 6;
  const titleFontSize = mode === 'simple' ? 8 : 9;
  
  return (
    <View style={styles.block}>
      <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>Checklist de Entrada</Text>

      <View style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 2,
        padding: 4,
        backgroundColor: '#fafafa'
      }}>
        
        {itensAprovados.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[styles.paragraph, { 
              fontSize: titleFontSize, 
              fontWeight: 'bold', 
              color: '#166534',
              marginBottom: 2,
              textAlign: 'left'
            }]}>
              Funcionalidades Operacionais ({itensAprovados.length})
            </Text>
            
            {itensAprovados.map((item, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 1,
                paddingLeft: 4
              }}>
                <View style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  backgroundColor: '#22c55e',
                  marginRight: 4,
                  marginTop: 0.5
                }} />
                <Text style={[styles.paragraph, { 
                  fontSize, 
                  color: '#374151', 
                  marginBottom: 0,
                  flex: 1
                }]}>
                  {item.nome}
                </Text>
              </View>
            ))}
          </View>
        )}

        {itensReprovados.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[styles.paragraph, { 
              fontSize: titleFontSize, 
              fontWeight: 'bold', 
              color: '#dc2626',
              marginBottom: 2,
              textAlign: 'left'
            }]}>
              Funcionalidades com Problemas ({itensReprovados.length})
            </Text>
            
            {itensReprovados.map((item, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 1,
                paddingLeft: 4
              }}>
                <View style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  backgroundColor: '#ef4444',
                  marginRight: 4,
                  marginTop: 0.5
                }} />
                <Text style={[styles.paragraph, { 
                  fontSize, 
                  color: '#374151', 
                  marginBottom: 0,
                  flex: 1
                }]}>
                  {item.nome}
                </Text>
              </View>
            ))}
          </View>
        )}


      </View>
    </View>
  );
}

export default ChecklistRenderer;