
'use client';
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { Input } from '@/components/Input';
import { CurrencyInput } from '@/components/CurrencyInput';
import { parseCurrencyNumber } from '@/lib/currencyMask';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { resolveEmpresaIdForClient } from '@/lib/resolve-empresa-id';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import TrialLimitGuard from '@/components/TrialLimitGuard';
import { FiArrowLeft, FiPlus, FiX } from 'react-icons/fi';

const TAB_LABELS: Record<string, string> = {
  dados: 'Dados',
  fiscal: 'Fiscal',
  imagens: 'Imagens',
  detalhes: 'Detalhes',
  outros: 'Outros',
};

const linkAcaoClass =
  'text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-medium inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed';

const modalPanelClass =
  'bg-white dark:bg-zinc-900 dark:text-zinc-100 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-600 w-full max-w-md p-6 relative';

const modalCloseClass =
  'absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300';

const currencyInputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:ring-offset-zinc-900';

export default function NovoProdutoPage() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  
  // Estados para categorias
  const [grupos, setGrupos] = useState<Array<{id: string, nome: string}>>([]);
  const [categorias, setCategorias] = useState<Array<{id: string, nome: string, grupo_id: string}>>([]);
  const [subcategorias, setSubcategorias] = useState<Array<{id: string, nome: string, categoria_id: string}>>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [modalNovaCategoria, setModalNovaCategoria] = useState(false);
  const [modalNovaSubcategoria, setModalNovaSubcategoria] = useState(false);
  const [modalNovoGrupo, setModalNovoGrupo] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [salvandoSubcategoria, setSalvandoSubcategoria] = useState(false);
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [formNovaCategoria, setFormNovaCategoria] = useState({ nome: '', descricao: '' });
  const [formNovaSubcategoria, setFormNovaSubcategoria] = useState({ nome: '', descricao: '' });
  const [formNovoGrupo, setFormNovoGrupo] = useState({ nome: '', descricao: '' });
  
  // Estados para fornecedores
  const [fornecedores, setFornecedores] = useState<Array<{id: string, nome: string}>>([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [modalNovoFornecedor, setModalNovoFornecedor] = useState(false);
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [formNovoFornecedor, setFormNovoFornecedor] = useState({ nome: '', cnpj: '', telefone: '', email: '' });

  // Estados para marcas
  const [marcas, setMarcas] = useState<Array<{ id: string; nome: string }>>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [modalNovaMarca, setModalNovaMarca] = useState(false);
  const [salvandoMarca, setSalvandoMarca] = useState(false);
  const [formNovaMarca, setFormNovaMarca] = useState({ nome: '' });
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
    fornecedor_id: '',
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
  // Usar o cliente importado
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { user, usuarioData, empresaData, session } = useAuth();

  // Função para carregar categorias - usando as mesmas APIs da página de categorias
  const carregarCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const fetchJson = async (url: string) => {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal, credentials: 'include' });
        if (!res.ok) return [];
        return res.json();
      };

      const empresaIdAtual = await resolveEmpresaIdForClient(empresaData, usuarioData);
      if (!empresaIdAtual) {
        setGrupos([]);
        setCategorias([]);
        setSubcategorias([]);
        return;
      }

      const sufixo = `?empresaId=${encodeURIComponent(empresaIdAtual)}`;
      const [gruposData, categoriasData, subcategoriasData] = await Promise.all([
        fetchJson(`/api/grupos/listar${sufixo}`),
        fetchJson(`/api/categorias/listar${sufixo}`),
        fetchJson(`/api/subcategorias/listar${sufixo}`),
      ]);

      clearTimeout(timeout);

      setGrupos(Array.isArray(gruposData) ? gruposData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setSubcategorias(Array.isArray(subcategoriasData) ? subcategoriasData : []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      addToast('error', 'Erro ao carregar categorias');
    } finally {
      setLoadingCategorias(false);
    }
  };

  // Função para carregar fornecedores
  const carregarFornecedores = async () => {
    setLoadingFornecedores(true);
    try {
      const empresaIdAtual = await resolveEmpresaIdForClient(empresaData, usuarioData);
      if (!empresaIdAtual) {
        setFornecedores([]);
        return;
      }

      const res = await fetch(`/api/fornecedores/listar?empresaId=${encodeURIComponent(empresaIdAtual)}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        setFornecedores([]);
        return;
      }

      const data = await res.json();
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      addToast('error', 'Erro ao carregar fornecedores');
    } finally {
      setLoadingFornecedores(false);
    }
  };

  const carregarMarcas = async () => {
    setLoadingMarcas(true);
    try {
      const empresaIdAtual = await resolveEmpresaIdForClient(empresaData, usuarioData);
      if (!empresaIdAtual) {
        setMarcas([]);
        return;
      }

      const res = await fetch(`/api/marcas-produtos/listar?empresaId=${encodeURIComponent(empresaIdAtual)}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        setMarcas([]);
        return;
      }

      const data = await res.json();
      setMarcas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      addToast('error', 'Erro ao carregar marcas');
    } finally {
      setLoadingMarcas(false);
    }
  };

  // Funções para filtrar categorias baseado na seleção
  const categoriasDoGrupo = categorias.filter(cat => cat.grupo_id === formData.grupo);
  const subcategoriasDaCategoria = subcategorias.filter(sub => sub.categoria_id === formData.categoria);

  // Função para limpar categoria quando grupo muda
  const handleGrupoChange = (grupoId: string) => {
    setFormData(prev => ({
      ...prev,
      grupo: grupoId,
      categoria: '', // Limpar categoria quando grupo muda
      subcategoria: '' // Limpar subcategoria quando grupo muda
    }));
  };

  // Função para limpar subcategoria quando categoria muda
  const handleCategoriaChange = (categoriaId: string) => {
    setFormData(prev => ({
      ...prev,
      categoria: categoriaId,
      subcategoria: ''
    }));
  };

  const salvarNovoGrupo = async () => {
    if (!formNovoGrupo.nome.trim()) {
      addToast('error', 'Nome do grupo é obrigatório');
      return;
    }

    setSalvandoGrupo(true);
    try {
      const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/grupos/salvar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nome: formNovoGrupo.nome.trim(),
          descricao: formNovoGrupo.descricao.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao criar grupo');

      setGrupos((prev) => [...prev, { id: data.id, nome: data.nome }]);
      handleGrupoChange(data.id);
      setFormNovoGrupo({ nome: '', descricao: '' });
      setModalNovoGrupo(false);
      addToast('success', 'Grupo criado!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar grupo');
    } finally {
      setSalvandoGrupo(false);
    }
  };

  const salvarNovaCategoria = async () => {
    if (!formData.grupo) {
      addToast('error', 'Selecione um grupo antes de criar a categoria');
      return;
    }
    if (!formNovaCategoria.nome.trim()) {
      addToast('error', 'Nome da categoria é obrigatório');
      return;
    }

    setSalvandoCategoria(true);
    try {
      const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/categorias/salvar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nome: formNovaCategoria.nome.trim(),
          descricao: formNovaCategoria.descricao.trim(),
          grupo_id: formData.grupo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao criar categoria');

      setCategorias((prev) => [
        ...prev,
        { id: data.id, nome: data.nome, grupo_id: data.grupo_id },
      ]);
      handleCategoriaChange(data.id);
      setFormNovaCategoria({ nome: '', descricao: '' });
      setModalNovaCategoria(false);
      addToast('success', 'Categoria criada!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar categoria');
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const salvarNovaSubcategoria = async () => {
    if (!formData.categoria) {
      addToast('error', 'Selecione uma categoria antes de criar a subcategoria');
      return;
    }
    if (!formNovaSubcategoria.nome.trim()) {
      addToast('error', 'Nome da subcategoria é obrigatório');
      return;
    }

    setSalvandoSubcategoria(true);
    try {
      const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/subcategorias/salvar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nome: formNovaSubcategoria.nome.trim(),
          descricao: formNovaSubcategoria.descricao.trim(),
          categoria_id: formData.categoria,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao criar subcategoria');

      setSubcategorias((prev) => [
        ...prev,
        { id: data.id, nome: data.nome, categoria_id: data.categoria_id },
      ]);
      setFormData((prev) => ({ ...prev, subcategoria: data.id }));
      setFormNovaSubcategoria({ nome: '', descricao: '' });
      setModalNovaSubcategoria(false);
      addToast('success', 'Subcategoria criada!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar subcategoria');
    } finally {
      setSalvandoSubcategoria(false);
    }
  };

  const salvarNovoFornecedor = async () => {
    if (!formNovoFornecedor.nome.trim()) {
      addToast('error', 'Nome do fornecedor é obrigatório');
      return;
    }

    setSalvandoFornecedor(true);
    try {
      const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/fornecedores/salvar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nome: formNovoFornecedor.nome.trim(),
          cnpj: formNovoFornecedor.cnpj.trim(),
          telefone: formNovoFornecedor.telefone.trim(),
          email: formNovoFornecedor.email.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao criar fornecedor');

      setFornecedores((prev) => [...prev, { id: data.id, nome: data.nome }]);
      setFormData((prev) => ({ ...prev, fornecedor_id: data.id }));
      setFormNovoFornecedor({ nome: '', cnpj: '', telefone: '', email: '' });
      setModalNovoFornecedor(false);
      addToast('success', 'Fornecedor criado!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar fornecedor');
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  const salvarNovaMarca = async () => {
    if (!formNovaMarca.nome.trim()) {
      addToast('error', 'Nome da marca é obrigatório');
      return;
    }

    setSalvandoMarca(true);
    try {
      const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/marcas-produtos/salvar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ nome: formNovaMarca.nome.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao criar marca');

      const novaMarca = { id: data.id, nome: data.nome };
      setMarcas((prev) => {
        const exists = prev.some((m) => m.nome.toLowerCase() === novaMarca.nome.toLowerCase());
        return exists ? prev : [...prev, novaMarca].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      });
      setFormData((prev) => ({ ...prev, marca: data.nome }));
      setFormNovaMarca({ nome: '' });
      setModalNovaMarca(false);
      addToast('success', 'Marca criada!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar marca');
    } finally {
      setSalvandoMarca(false);
    }
  };

  const grupoSelecionadoNome = grupos.find((g) => g.id === formData.grupo)?.nome;
  const categoriaSelecionadaNome = categorias.find((c) => c.id === formData.categoria)?.nome;

  // Recarregar categorias/fornecedores/marcas quando a empresa do contexto estiver disponível
  useEffect(() => {
    if (user || usuarioData?.empresa_id || empresaData?.id) {
      carregarCategorias();
      carregarFornecedores();
      carregarMarcas();
    }
  }, [user, usuarioData?.empresa_id, empresaData?.id]);

  useEffect(() => {
    if (!produtoId) return;

    let cancelled = false;

    const carregarProduto = async () => {
      try {
        const headers = await bearerAuthHeadersForApi(session, { 'Cache-Control': 'no-cache' });
        const response = await fetch(`/api/produtos-servicos/buscar?produtoId=${produtoId}`, {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });
        const { data: produtoData, error } = await response.json();

        if (cancelled) return;

        if (!response.ok || !produtoData || error) {
          addToast('error', typeof error === 'string' ? error : 'Erro ao carregar produto para edição.');
          return;
        }

        setFormData({
          nome: produtoData.nome || '',
          tipo: produtoData.tipo || '',
          codigo: produtoData.codigo || '',
          grupo: produtoData.grupo_id || '',
          categoria: produtoData.categoria_id || '',
          subcategoria: produtoData.subcategoria_id || '',
          custo: produtoData.custo?.toString() || '',
          preco: produtoData.preco?.toString() || '',
          unidade: produtoData.unidade || '',
          fornecedor_id: produtoData.fornecedor_id || '',
          marca: produtoData.marca || '',
          estoque_min: (produtoData.estoque_min ?? produtoData.estoque_minimo)?.toString() || '',
          estoque_max: produtoData.estoque_max?.toString() || '',
          estoque_atual: produtoData.estoque_atual?.toString() || '',
          situacao: produtoData.situacao || (produtoData.ativo ? 'Ativo' : 'Inativo'),
          ncm: produtoData.ncm || '',
          cfop: produtoData.cfop || '',
          cst: produtoData.cst || '',
          cest: produtoData.cest || '',
          largura_cm: produtoData.largura_cm?.toString() || '',
          altura_cm: produtoData.altura_cm?.toString() || '',
          profundidade_cm: produtoData.profundidade_cm?.toString() || '',
          peso_g: produtoData.peso_g?.toString() || '',
          obs: produtoData.obs || '',
          ativo: produtoData.ativo === false || produtoData.situacao === 'Inativo' ? 'false' : 'true',
          codigo_barras: produtoData.codigo_barras || '',
        });
        setExistingImageUrls(produtoData.imagens_url || produtoData.imagens || []);
      } catch {
        if (!cancelled) {
          addToast('error', 'Erro ao carregar produto para edição.');
        }
      }
    };

    carregarProduto();

    return () => {
      cancelled = true;
    };
  }, [produtoId, session, addToast]);

  const handleSubmit = async () => {
    // Gerar código sequencial por empresa, somente se não estiver editando (novo produto)
    const empresa_id =
      (await resolveEmpresaIdForClient(empresaData, usuarioData)) ||
      (typeof window !== 'undefined' ? localStorage.getItem('empresa_id') : null);
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
    
    console.log('🖼️ Processando imagens:', {
      arquivosSelecionados: arquivos.length,
      imagensExistentes: existingImageUrls.length,
      empresaId: empresa_id
    });

    // Envio de cada arquivo direto ao Supabase Storage
    for (const file of arquivos) {
      try {
      // Gera nome de arquivo seguro, substituindo caracteres inválidos
      const timestamp = Date.now();
      const rawName = file.name;
      const safeName = rawName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `produtos/${empresa_id}/${timestamp}_${safeName}`;
        
        console.log('📤 Fazendo upload da imagem:', file.name, 'para:', filePath);
        
      const { error: uploadError } = await supabase
        .storage
        .from('produtos')
        .upload(filePath, file, { upsert: false });
          
      if (uploadError) {
          console.error('❌ Erro ao fazer upload da imagem:', uploadError);
        addToast('error', `Erro ao fazer upload da imagem ${file.name}: ${uploadError.message}`);
        continue;
      }
        
      const { data: urlData } = supabase
        .storage
        .from('produtos')
        .getPublicUrl(filePath);
          
      uploadedImageUrls.push(urlData.publicUrl);
        console.log('✅ Imagem enviada com sucesso:', urlData.publicUrl);
      } catch (error) {
        console.error('❌ Erro inesperado no upload:', error);
        addToast('error', `Erro inesperado ao fazer upload da imagem ${file.name}`);
      }
    }
    // Log dos dados enviados
    // empresa_id já obtido acima

    const data = {
      nome: formData.nome || '',
      tipo: formData.tipo || 'produto',
      codigo: formData.codigo || '',
      grupo_id: formData.grupo || null,
      categoria_id: formData.categoria || null,
      subcategoria_id: formData.subcategoria || null,
      fornecedor_id: formData.fornecedor_id || null,
      custo: formData.custo ? parseCurrencyNumber(formData.custo) : 0,
      preco: formData.preco ? parseCurrencyNumber(formData.preco) : 0,
      unidade: formData.unidade || '',
      marca: formData.marca || '',
      estoque_min: formData.estoque_min ? parseFloat(formData.estoque_min) : 0,
      estoque_max: formData.estoque_max ? parseFloat(formData.estoque_max) : 0,
      estoque_atual: formData.estoque_atual ? parseFloat(formData.estoque_atual) : 0,
      situacao: formData.situacao || 'Ativo',
      ncm: formData.ncm || '',
      cfop: formData.cfop || '',
      cst: formData.cst || '',
      cest: formData.cest || '',
      largura_cm: formData.largura_cm ? parseFloat(formData.largura_cm) : 0,
      altura_cm: formData.altura_cm ? parseFloat(formData.altura_cm) : 0,
      profundidade_cm: formData.profundidade_cm ? parseFloat(formData.profundidade_cm) : 0,
      peso_g: formData.peso_g ? parseFloat(formData.peso_g) : 0,
      obs: formData.obs || '',
      empresa_id,
      ativo: formData.ativo === 'true',
      codigo_barras: formData.codigo_barras || '',
      imagens: [...existingImageUrls, ...uploadedImageUrls], // used in POST, not update
    };
    
    console.log('📊 Dados finais para envio:', {
      imagensExistentes: existingImageUrls.length,
      imagensNovas: uploadedImageUrls.length,
      totalImagens: [...existingImageUrls, ...uploadedImageUrls].length
    });


    // Log dos dados para API
    // Se for edição, atualiza o produto existente
    if (produtoId) {
      const updatePayload = {
        nome: data.nome,
        tipo: data.tipo,
        codigo: data.codigo,
        grupo_id: data.grupo_id,
        categoria_id: data.categoria_id,
        subcategoria_id: data.subcategoria_id,
        fornecedor_id: data.fornecedor_id,
        custo: data.custo,
        preco: data.preco,
        unidade: data.unidade,
        marca: data.marca,
        estoque_min: data.estoque_min,
        estoque_max: data.estoque_max,
        estoque_atual: data.estoque_atual,
        situacao: data.situacao,
        ncm: data.ncm,
        cfop: data.cfop,
        cst: data.cst,
        cest: data.cest,
        largura_cm: data.largura_cm,
        altura_cm: data.altura_cm,
        profundidade_cm: data.profundidade_cm,
        peso_g: data.peso_g,
        obs: data.obs,
        ativo: data.ativo,
        codigo_barras: data.codigo_barras,
        imagens: [...existingImageUrls, ...uploadedImageUrls],
        imagens_url: [...existingImageUrls, ...uploadedImageUrls],
        // Campos de texto para compatibilidade (podem ser null)
        grupo: null,
        categoria: null,
        subcategoria: null,
        fornecedor: null,
      };
      
      console.log('📊 Dados de atualização:', {
        produtoId,
        imagensExistentes: existingImageUrls.length,
        imagensNovas: uploadedImageUrls.length,
        totalImagens: [...existingImageUrls, ...uploadedImageUrls].length
      });
      
      try {
        const headers = await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' });
        const response = await fetch(`/api/produtos-servicos/atualizar?produtoId=${produtoId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Erro ao atualizar produto:', errorData);
          addToast('error', 'Erro ao atualizar produto: ' + (errorData.error || 'Erro desconhecido'));
        return;
      }
        
      addToast('success', `${data.tipo === 'servico' ? 'Serviço' : 'Produto'} atualizado com sucesso!`);
      router.push('/equipamentos');
      return;
      } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        addToast('error', `Erro ao atualizar ${data.tipo === 'servico' ? 'serviço' : 'produto'}`);
        return;
      }
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
        addToast('error', `Erro ao cadastrar ${data.tipo === 'servico' ? 'serviço' : 'produto'}: ${msg}`);
        return;
      }

      addToast('success', `${data.tipo === 'servico' ? 'Serviço' : 'Produto'} cadastrado com sucesso!`);
      router.push('/equipamentos');
    } catch (error) {
      console.error(error);
      addToast('error', `Erro ao cadastrar ${data.tipo === 'servico' ? 'serviço' : 'produto'}`);
    }
  };

  const isServico = formData.tipo === 'servico';
  const itemLabel = isServico ? 'Serviço' : 'Produto';
  const tituloPagina = produtoId ? `Editar ${itemLabel}` : `Novo ${itemLabel}`;
  const abas = isServico
    ? ['dados', 'outros']
    : ['dados', 'fiscal', 'imagens', 'detalhes', 'outros'];

  return (
    <TrialLimitGuard tipo="produtos">
      <MenuLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="flex flex-col gap-2 mb-6">
            <Link
              href="/equipamentos"
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 w-fit"
            >
              <FiArrowLeft className="w-4 h-4" />
              Voltar à lista
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
              {tituloPagina}
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Preencha os dados do {itemLabel.toLowerCase()}. Nome e preço de venda são obrigatórios.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm">
            <Tab.Group key={formData.tipo} manual defaultIndex={0}>
              <Tab.List className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-zinc-700 mb-6 pb-px">
                {abas.map((tabName) => (
                  <Tab
                    key={tabName}
                    className={({ selected }) =>
                      `px-4 py-2 text-sm font-medium rounded-t-md outline-none transition-colors ${
                        selected
                          ? 'bg-black text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-muted text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                      }`
                    }
                  >
                    {TAB_LABELS[tabName] || tabName}
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels>
                <Tab.Panel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome do {itemLabel} *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder={isServico ? 'Ex: Troca de tela' : 'Ex: Carregador Turbo'}
                      />
                    </div>
                    <div>
                      <Select
                        id="tipo"
                        label="Tipo"
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      >
                        <option value="produto">Produto</option>
                        <option value="servico">Serviço</option>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="grupo">Grupo</Label>
                        <button
                          type="button"
                          onClick={() => setModalNovoGrupo(true)}
                          className={linkAcaoClass}
                        >
                          <FiPlus size={12} />
                          Novo grupo
                        </button>
                      </div>
                      <Select
                        id="grupo"
                        value={formData.grupo}
                        onChange={(e) => handleGrupoChange(e.target.value)}
                        disabled={loadingCategorias}
                      >
                        <option value="">Selecione um grupo</option>
                        {grupos.map(grupo => (
                          <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="categoria">Categoria</Label>
                        <button
                          type="button"
                          onClick={() => setModalNovaCategoria(true)}
                          disabled={!formData.grupo}
                          className={linkAcaoClass}
                        >
                          <FiPlus size={12} />
                          Nova categoria
                        </button>
                      </div>
                      <Select
                        id="categoria"
                        value={formData.categoria}
                        onChange={(e) => handleCategoriaChange(e.target.value)}
                        disabled={loadingCategorias || !formData.grupo}
                      >
                        <option value="">
                          {formData.grupo ? 'Selecione uma categoria' : 'Selecione um grupo primeiro'}
                        </option>
                        {categoriasDoGrupo.map(categoria => (
                          <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="subcategoria">Subcategoria</Label>
                        <button
                          type="button"
                          onClick={() => setModalNovaSubcategoria(true)}
                          disabled={!formData.categoria}
                          className={linkAcaoClass}
                        >
                          <FiPlus size={12} />
                          Nova subcategoria
                        </button>
                      </div>
                      <Select
                        id="subcategoria"
                        value={formData.subcategoria}
                        onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                        disabled={loadingCategorias || !formData.categoria}
                      >
                        <option value="">
                          {formData.categoria ? 'Selecione uma subcategoria' : 'Selecione uma categoria primeiro'}
                        </option>
                        {subcategoriasDaCategoria.map(subcategoria => (
                          <option key={subcategoria.id} value={subcategoria.id}>{subcategoria.nome}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="custo">Preço de Custo</Label>
                      <CurrencyInput
                        id="custo"
                        value={formData.custo}
                        onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                        placeholder="0,00"
                        className={currencyInputClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preco">Preço de Venda *</Label>
                      <CurrencyInput
                        id="preco"
                        value={formData.preco}
                        onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                        placeholder="0,00"
                        className={currencyInputClass}
                      />
                    </div>
                    <div>
                      <Label>Situação</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.situacao === 'Ativo' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, situacao: 'Ativo', ativo: 'true' })}
                        >
                          Ativo
                        </Button>
                        <Button
                          type="button"
                          variant={formData.situacao === 'Inativo' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, situacao: 'Inativo', ativo: 'false' })}
                        >
                          Inativo
                        </Button>
                      </div>
                    </div>
                    {!isServico && (
                      <>
                        <div>
                          <Label htmlFor="codigo_barras">Código de barras</Label>
                          <Input
                            id="codigo_barras"
                            value={formData.codigo_barras}
                            onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                            placeholder="Ex: 7894561230001"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const codigoAleatorio = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
                              setFormData({ ...formData, codigo_barras: codigoAleatorio });
                            }}
                          >
                            Gerar Código
                          </Button>
                        </div>
                        <div>
                          <Select
                            id="unidade"
                            label="Unidade de Medida"
                            value={formData.unidade}
                            onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                          >
                            <option value="">Selecione</option>
                            <option value="Unidade">Unidade</option>
                            <option value="Caixa">Caixa</option>
                            <option value="Lote">Lote</option>
                            <option value="Pacote">Pacote</option>
                          </Select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Label htmlFor="fornecedor">Fornecedor</Label>
                            <button
                              type="button"
                              onClick={() => setModalNovoFornecedor(true)}
                              className={linkAcaoClass}
                            >
                              <FiPlus size={12} />
                              Novo fornecedor
                            </button>
                          </div>
                          <Select
                            id="fornecedor"
                            value={formData.fornecedor_id}
                            onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                            disabled={loadingFornecedores}
                          >
                            <option value="">Selecione um fornecedor</option>
                            {fornecedores.map((fornecedor) => (
                              <option key={fornecedor.id} value={fornecedor.id}>
                                {fornecedor.nome}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Label htmlFor="marca">Marca</Label>
                            <button
                              type="button"
                              onClick={() => setModalNovaMarca(true)}
                              className={linkAcaoClass}
                            >
                              <FiPlus size={12} />
                              Nova marca
                            </button>
                          </div>
                          <Select
                            id="marca"
                            value={formData.marca}
                            onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                            disabled={loadingMarcas}
                          >
                            <option value="">Selecione uma marca</option>
                            {marcas.map((marca) => (
                              <option key={marca.id} value={marca.nome}>
                                {marca.nome}
                              </option>
                            ))}
                            {formData.marca &&
                              !marcas.some((m) => m.nome.toLowerCase() === formData.marca.toLowerCase()) && (
                                <option value={formData.marca}>{formData.marca}</option>
                              )}
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="estoqueMin">Estoque Mínimo</Label>
                          <Input
                            id="estoqueMin"
                            type="number"
                            value={formData.estoque_min}
                            onChange={(e) => setFormData({ ...formData, estoque_min: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="estoqueMax">Estoque Máximo</Label>
                          <Input
                            id="estoqueMax"
                            type="number"
                            value={formData.estoque_max}
                            onChange={(e) => setFormData({ ...formData, estoque_max: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="estoqueAtual">Estoque Atual</Label>
                          <Input
                            id="estoqueAtual"
                            type="number"
                            value={formData.estoque_atual}
                            onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Tab.Panel>
                {!isServico && (
                  <>
                    <Tab.Panel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ncm">NCM</Label>
                          <Input
                            id="ncm"
                            value={formData.ncm}
                            onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                            placeholder="Ex: 8471.80.10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cfop">CFOP</Label>
                          <Input
                            id="cfop"
                            value={formData.cfop}
                            onChange={(e) => setFormData({ ...formData, cfop: e.target.value })}
                            placeholder="Ex: 5102"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cst">CST</Label>
                          <Input
                            id="cst"
                            value={formData.cst}
                            onChange={(e) => setFormData({ ...formData, cst: e.target.value })}
                            placeholder="Ex: 00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cest">CEST</Label>
                          <Input
                            id="cest"
                            value={formData.cest}
                            onChange={(e) => setFormData({ ...formData, cest: e.target.value })}
                            placeholder="Ex: 28.038.00"
                          />
                        </div>
                      </div>
                    </Tab.Panel>
                    <Tab.Panel>
                      <Label htmlFor="imagens">Upload de Imagens</Label>
                      <Input
                        id="imagens"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);

                          const oversized = files.filter((file) => file.size > 3 * 1024 * 1024);
                          if (oversized.length > 0) {
                            addToast('warning', `Algumas imagens excedem 3MB e foram ignoradas. (${oversized.length} arquivo(s))`);
                          }

                          const validFiles = files.filter((file) => file.size <= 3 * 1024 * 1024);
                          const totalImages = selectedImages.length + validFiles.length;

                          if (totalImages > 5) {
                            addToast('error', 'Você pode enviar no máximo 5 imagens de até 3MB cada.');
                            return;
                          }

                          setSelectedImages((prev) => [...prev, ...validFiles]);
                        }}
                      />
                      <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">
                        Adicione fotos para facilitar a identificação visual do produto. Máximo 5 imagens de até 3MB.
                      </p>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingImageUrls.map((url, index) => (
                          <div
                            key={`exist-${index}`}
                            className="border border-gray-200 dark:border-zinc-600 rounded-lg p-2 bg-gray-50 dark:bg-zinc-950"
                          >
                            <img
                              src={url}
                              alt={`Existing ${index}`}
                              className="w-full h-auto object-contain rounded"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full text-xs"
                              onClick={() =>
                                setExistingImageUrls(prev => prev.filter((_, i) => i !== index))
                              }
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                        {selectedImages.map((file, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-zinc-600 rounded-lg p-2 bg-gray-50 dark:bg-zinc-950"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index}`}
                              className="w-full h-auto object-contain rounded"
                            />
                            <p className="text-xs mt-2 break-words text-gray-600 dark:text-zinc-400">{file.name}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full text-xs"
                              onClick={() =>
                                setSelectedImages(prev => prev.filter((_, i) => i !== index))
                              }
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Tab.Panel>
                    <Tab.Panel>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="largura">Largura (cm)</Label>
                            <Input
                              id="largura"
                              type="number"
                              value={formData.largura_cm}
                              onChange={(e) => setFormData({ ...formData, largura_cm: e.target.value })}
                              placeholder="Ex: 10"
                            />
                          </div>
                          <div>
                            <Label htmlFor="altura">Altura (cm)</Label>
                            <Input
                              id="altura"
                              type="number"
                              value={formData.altura_cm}
                              onChange={(e) => setFormData({ ...formData, altura_cm: e.target.value })}
                              placeholder="Ex: 10"
                            />
                          </div>
                          <div>
                            <Label htmlFor="profundidade">Profundidade (cm)</Label>
                            <Input
                              id="profundidade"
                              type="number"
                              value={formData.profundidade_cm}
                              onChange={(e) => setFormData({ ...formData, profundidade_cm: e.target.value })}
                              placeholder="Ex: 5"
                            />
                          </div>
                        </div>
                        <div className="max-w-xs">
                          <Label htmlFor="peso">Peso (g)</Label>
                          <Input
                            id="peso"
                            type="number"
                            value={formData.peso_g}
                            onChange={(e) => setFormData({ ...formData, peso_g: e.target.value })}
                            placeholder="Ex: 250"
                          />
                        </div>
                      </div>
                    </Tab.Panel>
                  </>
                )}
                <Tab.Panel>
                  <div>
                    <Label htmlFor="obs">Observações</Label>
                    <Textarea
                      id="obs"
                      value={formData.obs}
                      onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                      placeholder={`Observações adicionais sobre o ${itemLabel.toLowerCase()}...`}
                      className="dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <Button type="button" onClick={handleSubmit}>
                {produtoId ? `Atualizar ${itemLabel}` : `Salvar ${itemLabel}`}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const ok = await confirm({
                    message: 'Tem certeza que deseja cancelar? As alterações serão perdidas.',
                    confirmText: 'Sim, cancelar',
                    cancelText: 'Continuar editando',
                  });
                  if (ok) router.push('/equipamentos');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        {/* Modal: novo grupo */}
        {modalNovoGrupo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !salvandoGrupo && setModalNovoGrupo(false)}
          >
            <div
              className={modalPanelClass}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalNovoGrupo(false)}
                className={modalCloseClass}
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">Novo grupo</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="novo-grupo-nome">Nome *</Label>
                  <Input
                    id="novo-grupo-nome"
                    value={formNovoGrupo.nome}
                    onChange={(e) => setFormNovoGrupo({ ...formNovoGrupo, nome: e.target.value })}
                    placeholder="Ex: CFTV"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="novo-grupo-desc">Descrição</Label>
                  <Input
                    id="novo-grupo-desc"
                    value={formNovoGrupo.descricao}
                    onChange={(e) => setFormNovoGrupo({ ...formNovoGrupo, descricao: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalNovoGrupo(false)} disabled={salvandoGrupo}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarNovoGrupo} disabled={salvandoGrupo}>
                    {salvandoGrupo ? 'Salvando...' : 'Criar grupo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: nova subcategoria */}
        {modalNovaSubcategoria && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !salvandoSubcategoria && setModalNovaSubcategoria(false)}
          >
            <div
              className={modalPanelClass}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalNovaSubcategoria(false)}
                className={modalCloseClass}
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-1">Nova subcategoria</h3>
              {categoriaSelecionadaNome && (
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                  Categoria:{' '}
                  <span className="font-medium text-gray-700 dark:text-zinc-200">{categoriaSelecionadaNome}</span>
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nova-sub-nome">Nome *</Label>
                  <Input
                    id="nova-sub-nome"
                    value={formNovaSubcategoria.nome}
                    onChange={(e) => setFormNovaSubcategoria({ ...formNovaSubcategoria, nome: e.target.value })}
                    placeholder="Ex: Dome 2MP"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="nova-sub-desc">Descrição</Label>
                  <Input
                    id="nova-sub-desc"
                    value={formNovaSubcategoria.descricao}
                    onChange={(e) => setFormNovaSubcategoria({ ...formNovaSubcategoria, descricao: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalNovaSubcategoria(false)} disabled={salvandoSubcategoria}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarNovaSubcategoria} disabled={salvandoSubcategoria}>
                    {salvandoSubcategoria ? 'Salvando...' : 'Criar subcategoria'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: nova categoria */}
        {modalNovaCategoria && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !salvandoCategoria && setModalNovaCategoria(false)}
          >
            <div
              className={modalPanelClass}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalNovaCategoria(false)}
                className={modalCloseClass}
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-1">Nova categoria</h3>
              {grupoSelecionadoNome && (
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                  Grupo:{' '}
                  <span className="font-medium text-gray-700 dark:text-zinc-200">{grupoSelecionadoNome}</span>
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nova-cat-nome">Nome *</Label>
                  <Input
                    id="nova-cat-nome"
                    value={formNovaCategoria.nome}
                    onChange={(e) => setFormNovaCategoria({ ...formNovaCategoria, nome: e.target.value })}
                    placeholder="Ex: Câmeras IP"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="nova-cat-desc">Descrição</Label>
                  <Input
                    id="nova-cat-desc"
                    value={formNovaCategoria.descricao}
                    onChange={(e) => setFormNovaCategoria({ ...formNovaCategoria, descricao: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalNovaCategoria(false)} disabled={salvandoCategoria}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarNovaCategoria} disabled={salvandoCategoria}>
                    {salvandoCategoria ? 'Salvando...' : 'Criar categoria'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: novo fornecedor */}
        {modalNovoFornecedor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !salvandoFornecedor && setModalNovoFornecedor(false)}
          >
            <div
              className={modalPanelClass}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalNovoFornecedor(false)}
                className={modalCloseClass}
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">Novo fornecedor</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="novo-forn-nome">Nome *</Label>
                  <Input
                    id="novo-forn-nome"
                    value={formNovoFornecedor.nome}
                    onChange={(e) => setFormNovoFornecedor({ ...formNovoFornecedor, nome: e.target.value })}
                    placeholder="Ex: Distribuidora ABC"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="novo-forn-cnpj">CNPJ</Label>
                  <Input
                    id="novo-forn-cnpj"
                    value={formNovoFornecedor.cnpj}
                    onChange={(e) => setFormNovoFornecedor({ ...formNovoFornecedor, cnpj: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label htmlFor="novo-forn-tel">Telefone</Label>
                  <Input
                    id="novo-forn-tel"
                    value={formNovoFornecedor.telefone}
                    onChange={(e) => setFormNovoFornecedor({ ...formNovoFornecedor, telefone: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label htmlFor="novo-forn-email">E-mail</Label>
                  <Input
                    id="novo-forn-email"
                    type="email"
                    value={formNovoFornecedor.email}
                    onChange={(e) => setFormNovoFornecedor({ ...formNovoFornecedor, email: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalNovoFornecedor(false)} disabled={salvandoFornecedor}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarNovoFornecedor} disabled={salvandoFornecedor}>
                    {salvandoFornecedor ? 'Salvando...' : 'Criar fornecedor'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: nova marca */}
        {modalNovaMarca && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !salvandoMarca && setModalNovaMarca(false)}
          >
            <div
              className={modalPanelClass}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalNovaMarca(false)}
                className={modalCloseClass}
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">Nova marca</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nova-marca-nome">Nome *</Label>
                  <Input
                    id="nova-marca-nome"
                    value={formNovaMarca.nome}
                    onChange={(e) => setFormNovaMarca({ nome: e.target.value })}
                    placeholder="Ex: Samsung"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalNovaMarca(false)} disabled={salvandoMarca}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarNovaMarca} disabled={salvandoMarca}>
                    {salvandoMarca ? 'Salvando...' : 'Criar marca'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </MenuLayout>
    </TrialLimitGuard>
  );
}
