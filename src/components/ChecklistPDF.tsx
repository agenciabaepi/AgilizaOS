import { View, Text } from '@react-pdf/renderer';

interface ChecklistItem {
  id: string;
  nome: string;
  categoria: string;
}

interface ChecklistPDFProps {
  checklistData: string | null;
  checklistItens?: ChecklistItem[];
  styles: any;
}

export default function ChecklistPDF({ checklistData, checklistItens = [], styles }: ChecklistPDFProps) {
  console.log('🔍 ChecklistPDF - Dados recebidos:', { 
    checklistData: checklistData ? 'presente' : 'ausente', 
    checklistItens: checklistItens.length,
    itens: checklistItens 
  });
  
  if (!checklistData) {
    console.log('⚠️ ChecklistPDF - Nenhum checklistData fornecido');
    return null;
  }

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    console.log('🔍 ChecklistPDF - Dados do checklist:', checklist);
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga === true) {
      console.log('⚠️ ChecklistPDF - Aparelho não liga detectado');
      return (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
          <View style={{
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
            borderRadius: 8,
            padding: 12,
            marginTop: 8
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 12,
                height: 12,
                borderWidth: 1,
                borderColor: '#d32f2f',
                borderRadius: 2,
                backgroundColor: '#fef2f2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8
              }}>
                <Text style={{ fontSize: 8, color: '#d32f2f', fontWeight: 'bold' }}>✕</Text>
              </View>
              <Text style={[styles.paragraph, { fontSize: 10, fontWeight: 'bold', color: '#d32f2f' }]}>
                ⚠️ Aparelho não liga
              </Text>
            </View>
            <Text style={[styles.paragraph, { fontSize: 9, color: '#d32f2f' }]}>
              Como o aparelho não liga, não é possível realizar o checklist para verificar quais funcionalidades estão operacionais. Após o técnico conseguir fazer o aparelho ligar (caso tenha conserto), será realizado o checklist completo para identificar quais componentes estão ou não funcionando.
            </Text>
          </View>
        </View>
      );
    }

    // Renderizar checklist baseado nos dados fornecidos e itens reais
    const itensAprovados: ChecklistItem[] = [];
    const itensReprovados: ChecklistItem[] = [];

    // Processar dados do checklist com nomes reais dos itens
    Object.keys(checklist).forEach(key => {
      if (key !== 'aparelhoNaoLiga') {
        // Primeiro tentar encontrar por ID (formato UUID)
        let item = checklistItens.find(i => i.id === key);
        
        // Se não encontrar por ID, criar item fake para nomes antigos em camelCase
        if (!item) {
          // Mapear nomes antigos para nomes legíveis
          const nomesMapeados: {[key: string]: string} = {
            'altoFalante': 'Alto-falante',
            'microfone': 'Microfone', 
            'cameraFrontal': 'Câmera frontal',
            'cameraTraseira': 'Câmera traseira',
            'conectores': 'Conectores',
            'botoes': 'Botões',
            'vibracao': 'Vibração',
            'wifi': 'WiFi',
            'bluetooth': 'Bluetooth',
            'biometria': 'Biometria',
            'carga': 'Carga',
            'toqueTela': 'Toque na tela'
          };
          
          if (nomesMapeados[key]) {
            item = {
              id: key,
              nome: nomesMapeados[key],
              categoria: 'legacy'
            };
          }
        }
        
        if (item) {
          const isAprovado = checklist[key] === true;
          if (isAprovado) {
            itensAprovados.push(item);
          } else if (checklist[key] === false) {
            itensReprovados.push(item);
          }
        } else {
          console.log('⚠️ Item de checklist não encontrado:', key);
        }
      }
    });
    
    console.log('📊 ChecklistPDF - Resultado processamento:', {
      totalKeys: Object.keys(checklist).length,
      aprovados: itensAprovados.length,
      reprovados: itensReprovados.length
    });

    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
        
        {itensAprovados.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.paragraph, { fontSize: 9, fontWeight: 'bold', color: '#16a34a', marginBottom: 4 }]}>
              ✅ Testes Aprovados:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {itensAprovados.map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <View style={{ 
                    width: 12, 
                    height: 12, 
                    borderWidth: 1, 
                    borderColor: '#16a34a', 
                    borderRadius: 2, 
                    backgroundColor: '#f0fdf4',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 4
                  }}>
                    <Text style={{ fontSize: 8, color: '#16a34a', fontWeight: 'bold' }}>✓</Text>
                  </View>
                  <Text style={[styles.paragraph, { fontSize: 8, color: '#16a34a' }]}>
                    {item.nome}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {itensReprovados.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.paragraph, { fontSize: 9, fontWeight: 'bold', color: '#d32f2f', marginBottom: 4 }]}>
              ❌ Testes Reprovados:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {itensReprovados.map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <View style={{ 
                    width: 12, 
                    height: 12, 
                    borderWidth: 1, 
                    borderColor: '#d32f2f', 
                    borderRadius: 2, 
                    backgroundColor: '#fef2f2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 4
                  }}>
                    <Text style={{ fontSize: 8, color: '#d32f2f', fontWeight: 'bold' }}>×</Text>
                  </View>
                  <Text style={[styles.paragraph, { fontSize: 8, color: '#d32f2f' }]}>
                    {item.nome}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {itensAprovados.length === 0 && itensReprovados.length === 0 && (
          <View style={{
            backgroundColor: '#f8f9fa',
            borderWidth: 1,
            borderColor: '#dee2e6',
            borderRadius: 8,
            padding: 12,
            marginTop: 8
          }}>
            <Text style={[styles.paragraph, { fontSize: 9, color: '#666', textAlign: 'center' }]}>
              📋 Nenhum teste foi realizado no checklist de entrada.
            </Text>
          </View>
        )}
      </View>
    );
  } catch (error) {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
        <Text style={[styles.paragraph, { fontSize: 9, color: '#d32f2f' }]}>
          Erro ao carregar checklist
        </Text>
      </View>
    );
  }
}