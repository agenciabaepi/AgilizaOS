'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

interface ChecklistItem {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  ativo: boolean;
  ordem: number;
  obrigatorio: boolean;
}

interface ChecklistPDFProps {
  checklistData: string | null;
  styles: any;
}

export default function ChecklistPDF({ checklistData, styles }: ChecklistPDFProps) {
  const { empresaData } = useAuth();
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar itens de checklist da empresa
  useEffect(() => {
    const fetchItens = async () => {
      if (!empresaData?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/checklist-itens?empresa_id=${empresaData.id}&ativo=true`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setItens(data.itens || []);
        } else {
          console.error('Erro ao carregar itens de checklist:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao carregar itens de checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItens();
  }, [empresaData?.id]);

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

    if (loading) {
      return (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
          <Text style={[styles.paragraph, { fontSize: 9, color: '#666' }]}>
            Carregando checklist...
          </Text>
        </View>
      );
    }

    if (itens.length === 0) {
      return (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Checklist de Entrada</Text>
          <Text style={[styles.paragraph, { fontSize: 9, color: '#666' }]}>
            Nenhum item de checklist configurado para esta empresa.
          </Text>
        </View>
      );
    }

    // Separar itens aprovados e reprovados
    const itensAprovados: ChecklistItem[] = [];
    const itensReprovados: ChecklistItem[] = [];

    itens.forEach(item => {
      const isAprovado = checklist[item.id] === true;
      if (isAprovado) {
        itensAprovados.push(item);
      } else {
        itensReprovados.push(item);
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
              {itensAprovados.map(item => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
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
              {itensReprovados.map(item => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
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
