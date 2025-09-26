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
  if (!checklistData) return null;

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga) {
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
                Aparelho não liga
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
        const item = checklistItens.find(i => i.id === key);
        if (item) {
          const isAprovado = checklist[key] === true;
          if (isAprovado) {
            itensAprovados.push(item);
          } else if (checklist[key] === false) {
            itensReprovados.push(item);
          }
        }
      }
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
          <Text style={[styles.paragraph, { fontSize: 9, color: '#666' }]}>
            Nenhum teste foi realizado no checklist de entrada.
          </Text>
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