
'use client';
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { Input } from '@/components/Input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import ProtectedArea from '@/components/ProtectedArea';

export default function NovoProdutoPage() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'produto',
    codigo: '',
    grupo: '',
    categoria: '',
    subcategoria: '',
    custo: '',
    preco: '',
    unidade: '',
    fornecedor: '',
    marca: '',
    estoque_min: '',
    estoque_max: '',
    estoque_atual: '',
    situacao: 'Ativo',
    ncm: '',
    cfop: '',
    cst: '',
    cest: '',
    largura_cm: '',
    altura_cm: '',
    profundidade_cm: '',
    peso_g: '',
    obs: '',
    ativo: 'true',
    codigo_barras: '',
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const produtoId = searchParams.get('produtoId');
  const supabase = createBrowserSupabaseClient();
  const { addToast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (produtoId) {
      supabase
        .from('produtos_servicos')
        .select('*')
        .eq('id', produtoId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setFormData({
              nome: data.nome || '',
              tipo: data.tipo || '',
              codigo: data.codigo || '',
              grupo: data.grupo || '',
              categoria: data.categoria || '',
              subcategoria: data.subcategoria || '',
              custo: data.custo?.toString() || '',
              preco: data.preco?.toString() || '',
              unidade: data.unidade || '',
              fornecedor: data.fornecedor || '',
              marca: data.marca || '',
              estoque_min: data.estoque_min?.toString() || '',
              estoque_max: data.estoque_max?.toString() || '',
              estoque_atual: data.estoque_atual?.toString() || '',
              situacao: data.situacao || '',
              ncm: data.ncm || '',
              cfop: data.cfop || '',
              cst: data.cst || '',
              cest: data.cest || '',
              largura_cm: data.largura_cm?.toString() || '',
              altura_cm: data.altura_cm?.toString() || '',
              profundidade_cm: data.profundidade_cm?.toString() || '',
              peso_g: data.peso_g?.toString() || '',
              obs: data.obs || '',
              ativo: data.ativo ? 'true' : 'false',
              codigo_barras: data.codigo_barras || '',
            });
            setExistingImageUrls(data.imagens_url || []);
          }
        });
    }
  }, [produtoId]);

  const handleSubmit = async () => {
    // Gerar código sequencial por empresa, somente se não estiver editando (novo produto)
    const empresa_id = localStorage.getItem('empresa_id');
    if (!empresa_id) {
      addToast('error', 'Erro: empresa_id não encontrado. Faça login novamente.');
      return;
    }

    if (!produtoId) {
      let proximoCodigo = 1;
      try {
        const res = await fetch(`/api/produtos?empresa_id=${empresa_id}`);
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const json = await res.json();
          const ultimo = Number(json?.ultimoCodigo) || 0;
          proximoCodigo = ultimo + 1;
        } else {
          const text = await res.text();
          console.error('Erro GET /api/produtos:', res.status, text);
        }
      } catch (err) {
        console.error('Erro ao buscar último código:', err);
      }
      formData.codigo = proximoCodigo.toString();
    }

    // Checagem dos campos obrigatórios: apenas Nome e Preço de Venda
    if (!formData.nome || !formData.preco) {
      addToast('error', 'Por favor, preencha os campos obrigatórios: Nome e Preço de Venda.');
      return;
    }

    // Coleta das imagens selecionadas como arquivos
    const arquivos = selectedImages ? Array.from(selectedImages) : [];
    const uploadedImageUrls: string[] = [];

    // Envio de cada arquivo direto ao Supabase Storage
    for (const file of arquivos) {
      // Gera nome de arquivo seguro, substituindo caracteres inválidos
      const timestamp = Date.now();
      const rawName = file.name;
      const safeName = rawName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `produtos/${empresa_id}/${timestamp}_${safeName}`;
      // Apaga logo anterior, se quiser comportamento similar ao logo
      // await handleDeleteLogo? (não aplicável aqui)
      const { error: uploadError } = await supabase
        .storage
        .from('produtos')
        .upload(filePath, file, { upsert: false });
      if (uploadError) {
        console.error('Erro ao fazer upload da imagem:', uploadError);
        addToast('error', `Erro ao fazer upload da imagem ${file.name}: ${uploadError.message}`);
        continue;
      }
      const { data } = supabase
        .storage
        .from('produtos')
        .getPublicUrl(filePath);
      uploadedImageUrls.push(data.publicUrl);
    }
    // Log dos dados enviados
    console.log('Dados enviados:', formData);

    // empresa_id já obtido acima

    const data = {
      nome: formData.nome,
      tipo: formData.tipo,
      codigo: formData.codigo,
      grupo: formData.grupo,
      categoria: formData.categoria,
      subcategoria: formData.subcategoria,
      custo: parseFloat(formData.custo || '0'),
      preco: parseFloat(formData.preco || '0'),
      unidade: formData.unidade,
      fornecedor: formData.fornecedor,
      marca: formData.marca,
      estoque_min: parseFloat(formData.estoque_min || '0'),
      estoque_max: parseFloat(formData.estoque_max || '0'),
      estoque_atual: parseFloat(formData.estoque_atual || '0'),
      situacao: formData.situacao,
      ncm: formData.ncm,
      cfop: formData.cfop,
      cst: formData.cst,
      cest: formData.cest,
      largura_cm: parseFloat(formData.largura_cm || '0'),
      altura_cm: parseFloat(formData.altura_cm || '0'),
      profundidade_cm: parseFloat(formData.profundidade_cm || '0'),
      peso_g: parseFloat(formData.peso_g || '0'),
      obs: formData.obs,
      empresa_id,
      ativo: true,
      codigo_barras: formData.codigo_barras,
      imagens: [...existingImageUrls, ...uploadedImageUrls], // used in POST, not update
    };

    // Se for edição, atualiza o produto existente
    if (produtoId) {
      const updatePayload = {
        ...data,
        imagens_url: [...existingImageUrls, ...uploadedImageUrls],
      };
      const { error } = await supabase
        .from('produtos_servicos')
        .update(updatePayload)
        .eq('id', produtoId);
      if (error) {
        console.error('Erro ao atualizar produto:', error);
        addToast('error', 'Erro ao atualizar produto: ' + error.message);
        return;
      }
      addToast('success', 'Produto atualizado com sucesso!');
      router.push('/equipamentos');
      return;
    }

    // Se não for edição, prossegue com o cadastro (POST)
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let msg = '';
        try {
          const errJson = await response.json();
          msg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
        } catch {
          const text = await response.text();
          console.error('Erro não-JSON da API:', text);
          msg = text || 'Erro desconhecido';
        }
        addToast('error', `Erro ao cadastrar produto: ${msg}`);
        return;
      }

      addToast('success', 'Produto cadastrado com sucesso!');
      router.push('/equipamentos');
    } catch (error) {
      console.error(error);
      addToast('error', 'Erro ao cadastrar produto');
    }
  };

  return (
    <ProtectedArea area="equipamentos">
      <MenuLayout>
        <main className="flex flex-col items-center justify-start flex-1 px-4 py-8">
          <div className="w-full max-w-5xl">
            <h1 className="text-2xl font-bold mb-6">
              {produtoId ? 'Editar Produto' : 'Novo Produto'}
            </h1>
            {/* TODO: Aqui vai todo o conteúdo das tabs, panels, formulários, botões etc, sem duplicidade e sem marcadores de conflito. */}
          </div>
        </main>
      </MenuLayout>
    </ProtectedArea>
  );
}