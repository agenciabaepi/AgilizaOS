// =====================================================
// TESTE PASSO A PASSO DA API UPDATE-STATUS
// =====================================================

const testAPIStepByStep = async () => {
    console.log('🔍 Testando API passo a passo...');
    
    // Teste 1: Verificar se a API responde
    console.log('\n=== TESTE 1: CONECTIVIDADE ===');
    try {
        const response = await fetch('/api/ordens/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                osId: '124',
                newStatus: 'ORÇAMENTO',
                newStatusTecnico: 'em atendimento'
            }),
        });

        console.log('✅ Conectividade OK');
        console.log('📊 Status:', response.status);
        console.log('📊 Status Text:', response.statusText);
        console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
        
        // Teste 2: Verificar resposta
        console.log('\n=== TESTE 2: RESPOSTA ===');
        const responseText = await response.text();
        console.log('📄 Response Text:', responseText);
        
        if (!response.ok) {
            console.log('❌ Resposta não OK');
            try {
                const errorData = JSON.parse(responseText);
                console.log('📄 Error Data:', errorData);
            } catch (e) {
                console.log('❌ Não foi possível fazer parse da resposta');
            }
            return;
        }

        // Teste 3: Parse da resposta
        console.log('\n=== TESTE 3: PARSE DA RESPOSTA ===');
        try {
            const result = JSON.parse(responseText);
            console.log('✅ Parse OK');
            console.log('📄 Result:', result);
            return result;
        } catch (e) {
            console.log('❌ Erro no parse:', e);
            return;
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        console.error('❌ Stack:', error.stack);
        return { error: error.message };
    }
};

// Executar teste
testAPIStepByStep();

