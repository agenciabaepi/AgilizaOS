// =====================================================
// TESTE DA API UPDATE-STATUS - DIAGNÓSTICO COMPLETO
// =====================================================

// Teste da API que está falhando
async function testUpdateStatusAPI() {
    console.log('🔍 Testando API /api/ordens/update-status...');
    
    try {
        const response = await fetch('/api/ordens/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                osId: '124', // OS que está sendo editada
                newStatus: 'ORÇAMENTO',
                newStatusTecnico: 'em atendimento'
            }),
        });

        console.log('📊 Status da resposta:', response.status);
        console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Erro na API:', errorData);
            return errorData;
        }

        const result = await response.json();
        console.log('✅ Sucesso na API:', result);
        return result;

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return { error: error.message };
    }
}

// Teste direto no Supabase (bypass da API)
async function testDirectSupabaseUpdate() {
    console.log('🔍 Testando UPDATE direto no Supabase...');
    
    try {
        // Usar o cliente do Supabase do browser
        const { data, error } = await supabase
            .from('ordens_servico')
            .update({ 
                updated_at: new Date().toISOString(),
                status_tecnico: 'em atendimento'
            })
            .eq('numero_os', '124')
            .select();

        if (error) {
            console.error('❌ Erro no UPDATE direto:', error);
            return { error: error.message };
        }

        console.log('✅ UPDATE direto funcionou:', data);
        return { success: true, data };

    } catch (error) {
        console.error('❌ Erro na requisição direta:', error);
        return { error: error.message };
    }
}

// Executar ambos os testes
async function runDiagnostics() {
    console.log('🚀 Iniciando diagnósticos...');
    
    // Teste 1: API update-status
    console.log('\n=== TESTE 1: API UPDATE-STATUS ===');
    const apiResult = await testUpdateStatusAPI();
    
    // Teste 2: UPDATE direto
    console.log('\n=== TESTE 2: UPDATE DIRETO ===');
    const directResult = await testDirectSupabaseUpdate();
    
    // Resultado final
    console.log('\n=== RESUMO DOS TESTES ===');
    console.log('API Update-Status:', apiResult);
    console.log('UPDATE Direto:', directResult);
    
    return { apiResult, directResult };
}

// Executar diagnósticos
runDiagnostics();





