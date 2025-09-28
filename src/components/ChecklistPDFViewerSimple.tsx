import { View, Text } from '@react-pdf/renderer';

interface ChecklistPDFViewerSimpleProps {
  checklistData: string | null;
  equipamentoCategoria?: string;
  styles: any;
}

export default function ChecklistPDFViewerSimple({ checklistData, equipamentoCategoria, styles }: ChecklistPDFViewerSimpleProps) {
  
  console.log('🔍 ChecklistPDFViewerSimple - INICIANDO:', {
    hasChecklistData: !!checklistData,
    equipamentoCategoria,
    checklistData
  });
  
  if (!checklistData || checklistData === '{}' || checklistData === 'null') {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
        <Text style={styles.text}>Nenhum teste foi realizado no checklist de entrada.</Text>
      </View>
    );
  }

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga) {
      return (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
          <Text style={[styles.text, { color: '#dc2626', fontWeight: 'bold' }]}>
            ⚠️ Aparelho não liga
          </Text>
          <Text style={[styles.text, { fontSize: 10, color: '#666' }]}>
            Como o aparelho não liga, não é possível realizar o checklist completo.
          </Text>
        </View>
      );
    }

    // Função para mapear UUID para nome legível
    const mapearUUIDParaNome = (uuid: string): string => {
      // Mapeamento de UUIDs conhecidos para nomes legíveis
      const mapeamento: { [key: string]: string } = {
        '71cd9264-20d4-43fb-bb26-b9a86e110beb': 'Tela',
        '86513a33-ca92-4a87-982b-d9a085fbbc74': 'Touch',
        'e9caaba9-c2a9-43f7-8bc9-1b8a9f4e4a47': 'Câmera traseira',
        '32e6224f-7265-4394-8fe5-93807e3ef65b': 'Alto-falante',
        '16dd25f3-c94a-409a-8c17-2dd3cfaee93a': 'Microfone',
        '7a51ea79-a81e-4fac-b828-9ac8f6957ecf': 'Bateria',
        'bacfd834-4846-4eae-a20c-8e9243f581af': 'Botões',
        '86aabd8e-abc8-4a46-ab9f-66ebc959fdf2': 'Conectividade',
        '03c34e98-1e42-4f1c-9826-cab113d6c184': 'Sistema',
        '84a5eeb7-cc1e-43b5-9d5a-02a75e770f3c': 'Armazenamento',
        'e96b519f-041a-4adb-b291-8f7690299e9e': 'Performance',
        'e304f845-7b35-425d-ac46-b58846633a37': 'Sensores',
        'a04b287a-0c0c-4550-9ce0-3a13b796e4e1': 'Aparelho não liga',
        'e2e8e2b0-959e-4485-83f6-ad0aa4c3469f': 'Alto-falante',
        // Novos UUIDs encontrados
        'eea0cb93-a206-49fe-aa83-37da8fe894c3': 'Câmera frontal',
        'f93c1041-1ec5-4271-8612-7ef49915737a': 'Microfone'
      };
      
      return mapeamento[uuid] || uuid; // Retorna o nome mapeado ou o UUID original se não encontrar
    };

    // Processar itens aprovados e reprovados
    const itensAprovados: string[] = [];
    const itensReprovados: string[] = [];

    // Processar dados do checklist
    Object.entries(checklist).forEach(([key, value]) => {
      if (key !== 'aparelhoNaoLiga') {
        // Verificar se é aprovado (true, 'aprovado', 'true', 1)
        if (value === true || value === 'aprovado' || value === 'true' || value === 1) {
          itensAprovados.push(mapearUUIDParaNome(key));
        } 
        // Verificar se é reprovado (false, 'reprovado', 'false', 0)
        else if (value === false || value === 'reprovado' || value === 'false' || value === 0) {
          itensReprovados.push(mapearUUIDParaNome(key));
        }
        // Se não é nem aprovado nem reprovado, considerar como reprovado por padrão
        else if (value !== null && value !== undefined && value !== '') {
          itensReprovados.push(mapearUUIDParaNome(key));
        }
      }
    });

    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
        {equipamentoCategoria && (
          <View style={{ 
            backgroundColor: '#dbeafe', 
            padding: 4, 
            borderRadius: 12, 
            alignSelf: 'flex-start',
            marginBottom: 8
          }}>
            <Text style={{ 
              fontSize: 8, 
              color: '#1e40af', 
              fontWeight: 'bold',
              paddingHorizontal: 6
            }}>
              Categoria: {equipamentoCategoria}
            </Text>
          </View>
        )}
        
        {itensAprovados.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.text, { color: '#16a34a', fontWeight: 'bold', marginBottom: 8 }]}>
              ✅ Testes Aprovados:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {itensAprovados.map((item, index) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  width: '48%',
                  marginBottom: 4
                }}>
                  <View style={{
                    width: 12,
                    height: 12,
                    borderWidth: 1,
                    borderColor: '#16a34a',
                    borderRadius: 2,
                    backgroundColor: '#f0fdf4',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 6
                  }}>
                    <Text style={{ color: '#16a34a', fontSize: 8, fontWeight: 'bold' }}>✓</Text>
                  </View>
                  <Text style={[styles.text, { color: '#16a34a', fontSize: 9 }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {itensReprovados.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.text, { color: '#dc2626', fontWeight: 'bold', marginBottom: 8 }]}>
              ❌ Testes Reprovados:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {itensReprovados.map((item, index) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  width: '48%',
                  marginBottom: 4
                }}>
                  <View style={{
                    width: 12,
                    height: 12,
                    borderWidth: 1,
                    borderColor: '#dc2626',
                    borderRadius: 2,
                    backgroundColor: '#fef2f2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 6
                  }}>
                    <Text style={{ color: '#dc2626', fontSize: 8, fontWeight: 'bold' }}>✗</Text>
                  </View>
                  <Text style={[styles.text, { color: '#dc2626', fontSize: 9 }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {itensAprovados.length === 0 && itensReprovados.length === 0 && (
          <Text style={styles.text}>Nenhum teste foi realizado no checklist de entrada.</Text>
        )}
      </View>
    );

  } catch (error) {
    console.error('❌ Erro ao processar checklist:', error);
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
        <Text style={styles.text}>Erro ao processar dados do checklist.</Text>
      </View>
    );
  }
}
