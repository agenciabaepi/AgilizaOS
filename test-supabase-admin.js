// =====================================================
// TESTE DO CREATEADMINCLIENT
// =====================================================

const testSupabaseAdmin = async () => {
    console.log('🔍 Testando createAdminClient...');
    
    try {
        // Importar o createAdminClient
        const { createAdminClient } = await import('/src/lib/supabaseClient.ts');
        
        console.log('✅ createAdminClient importado');
        
        // Criar cliente
        const supabase = createAdminClient();
        console.log('✅ Cliente criado');
        
        // Testar SELECT simples
        console.log('🔍 Testando SELECT...');
        const { data, error } = await supabase
            .from('ordens_servico')
            .select('id, numero_os, status, status_tecnico')
            .eq('numero_os', '124')
            .single();
            
        if (error) {
            console.error('❌ Erro no SELECT:', error);
            return { error: error.message };
        }
        
        console.log('✅ SELECT funcionou:', data);
        
        // Testar UPDATE simples
        console.log('🔍 Testando UPDATE...');
        const { data: updateData, error: updateError } = await supabase
            .from('ordens_servico')
            .update({ status_tecnico: 'teste' })
            .eq('id', data.id)
            .select()
            .single();
            
        if (updateError) {
            console.error('❌ Erro no UPDATE:', updateError);
            return { error: updateError.message };
        }
        
        console.log('✅ UPDATE funcionou:', updateData);
        
        return { success: true, data: updateData };
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
        return { error: error.message };
    }
};

// Executar teste
testSupabaseAdmin();





