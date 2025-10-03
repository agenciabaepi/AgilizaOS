const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTabelasCategorias() {
  console.log('Criando tabelas de categorias...');
  
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./src/lib/sql/categorias.sql', 'utf8');
    
    console.log('Executando script SQL...');
    
    // Executar o SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.log('Erro ao executar SQL via RPC:', error);
      
      // Tentar executar manualmente as principais tabelas
      console.log('Tentando criar tabelas manualmente...');
      
      // Criar tabela grupos_produtos
      const { error: gruposError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS grupos_produtos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (gruposError) {
        console.log('Erro ao criar tabela grupos_produtos:', gruposError);
      } else {
        console.log('✅ Tabela grupos_produtos criada');
      }
      
      // Criar tabela categorias_produtos
      const { error: categoriasError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS categorias_produtos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            grupo_id UUID NOT NULL REFERENCES grupos_produtos(id) ON DELETE CASCADE,
            empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (categoriasError) {
        console.log('Erro ao criar tabela categorias_produtos:', categoriasError);
      } else {
        console.log('✅ Tabela categorias_produtos criada');
      }
      
      // Criar tabela subcategorias_produtos
      const { error: subcategoriasError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS subcategorias_produtos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            categoria_id UUID NOT NULL REFERENCES categorias_produtos(id) ON DELETE CASCADE,
            empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (subcategoriasError) {
        console.log('Erro ao criar tabela subcategorias_produtos:', subcategoriasError);
      } else {
        console.log('✅ Tabela subcategorias_produtos criada');
      }
      
      return;
    }
    
    console.log('✅ Script SQL executado com sucesso:', data);
    
  } catch (error) {
    console.log('Erro geral:', error);
  }
}

criarTabelasCategorias();