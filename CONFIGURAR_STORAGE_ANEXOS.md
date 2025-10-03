# 📎 Configuração do Sistema de Anexos

## 🗄️ Configuração do Supabase Storage

Para que o sistema de anexos funcione, você precisa configurar o bucket no Supabase Storage:

### 1. Acessar o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Acesse seu projeto
- Vá para **Storage** no menu lateral

### 2. Criar o Bucket
- Clique em **"New bucket"**
- Nome: `anexos-contas`
- Marque como **"Public bucket"** (para permitir acesso público aos anexos)
- Clique em **"Create bucket"**

### 3. Configurar Políticas RLS (Row Level Security)

Execute este SQL no **Editor SQL** do Supabase:

```sql
-- Habilitar RLS no bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir upload de anexos
CREATE POLICY "Permitir upload de anexos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anexos-contas' AND
  auth.role() = 'authenticated'
);

-- Política para permitir leitura pública dos anexos
CREATE POLICY "Permitir leitura pública de anexos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anexos-contas'
);

-- Política para permitir exclusão de anexos
CREATE POLICY "Permitir exclusão de anexos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'anexos-contas' AND
  auth.role() = 'authenticated'
);
```

### 4. Executar Script de Banco de Dados

Execute o script `ADD_ANEXOS_CONTAS_PAGAR.sql` no Editor SQL do Supabase para adicionar o campo `anexos_url` na tabela.

## 🎯 Funcionalidades Implementadas

### ✅ Sistema Completo de Anexos
- **Upload de arquivos:** JPG, PNG, PDF, DOC, DOCX, TXT (máx. 10MB)
- **Visualização:** Abertura em nova aba
- **Download:** Download direto dos arquivos
- **Remoção:** Exclusão com confirmação
- **Interface intuitiva:** Ícones e contadores visuais

### 📋 Como Usar
1. **Acesse** uma conta existente
2. **Clique em "Editar"**
3. **Role até a seção "Anexos"**
4. **Clique em "Adicionar Anexo"**
5. **Selecione** o arquivo (comprovante, nota fiscal, etc.)
6. **Visualize/Download** os anexos conforme necessário

### 🎨 Interface
- **Coluna na tabela:** Mostra quantos anexos cada conta possui
- **Modal de edição:** Seção dedicada para gerenciar anexos
- **Ícones visuais:** Clipe de papel e contadores
- **Estados visuais:** Loading, erro, sucesso

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos:
- `src/components/AnexosManager.tsx` - Componente principal
- `src/app/api/contas-pagar/upload-anexo/route.ts` - API de upload
- `src/app/api/contas-pagar/remover-anexo/route.ts` - API de remoção
- `ADD_ANEXOS_CONTAS_PAGAR.sql` - Script de banco

### Modificados:
- `src/app/financeiro/contas-a-pagar/page.tsx` - Interface integrada

## 🚀 Próximos Passos

1. **Execute** o script SQL no Supabase
2. **Configure** o bucket de storage
3. **Teste** o sistema completo
4. **Deploy** as alterações

O sistema está pronto para uso! 🎉
