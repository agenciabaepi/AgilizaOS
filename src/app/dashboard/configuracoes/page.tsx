'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SupabaseError {
  message: string;
}

interface SupabaseUser {
  id: string;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  logo_url: string;
  telefone: string;
  email: string;
  website: string;
  user_id: string;
}

export default function ConfigEmpresa() {
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    logoUrl: '',
    telefone: '',
    email: '',
    website: ''
  });

  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser() as { data: { user: SupabaseUser }, error: SupabaseError | null };
        if (userError) throw new Error('Erro ao obter usuário: ' + userError.message);

        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('Resultado fetchEmpresa:', { data, error });

        if (error) {
          console.error('Erro ao buscar empresa:', error);
          setError(error.message || JSON.stringify(error) || 'Erro ao buscar dados');
        } else if (data) {
          setForm({
            nome: data.nome || '',
            cnpj: data.cnpj || '',
            endereco: data.endereco || '',
            logoUrl: data.logo_url || '',
            telefone: data.telefone || '',
            email: data.email || '',
            website: data.website || ''
          });
          setEmpresaId(data.id);
        }
      } catch (err: SupabaseError | Error) {
        console.error('Erro geral ao buscar empresa:', err);
        setError(err.message || 'Erro ao buscar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser() as { data: { user: SupabaseUser }, error: SupabaseError | null };
      if (userError) throw new Error('Erro ao obter usuário: ' + userError.message);

      if (!user) throw new Error('Usuário não autenticado');

      if (empresaId) {
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('user_id')
          .eq('id', empresaId)
          .maybeSingle();

        if (empresaError) {
          throw new Error('Erro ao verificar propriedade da empresa: ' + empresaError.message);
        }

        if (empresa && empresa.user_id !== user.id) {
          throw new Error('Você não tem permissão para editar esta empresa.');
        }
      }

      const empresaData: Partial<Empresa> = { 
        user_id: user.id, 
        nome: form.nome,
        cnpj: form.cnpj,
        endereco: form.endereco,
        logo_url: form.logoUrl,
        telefone: form.telefone,
        email: form.email,
        website: form.website
      };

      if (empresaId) {
        empresaData.id = empresaId;
      }

      console.log('user.id:', user.id);
      console.log('empresaId:', empresaId);
      console.log('empresaData:', empresaData);

      const { error } = await supabase
        .from('empresas')
        .upsert([empresaData]);

      if (error) {
        console.error('Erro Supabase:', error);
        setError(error.message || JSON.stringify(error) || 'Erro desconhecido');
      } else {
        alert('Configurações salvas com sucesso!');
        setIsEditing(false);
      }
    } catch (err: SupabaseError | Error) {
      console.error('Erro geral:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função para upload da logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    await handleDeleteLogo();

    const file = e.target.files[0];
    const filePath = `logos/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro ao fazer upload da logo:', uploadError);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    setForm({ ...form, logoUrl: data.publicUrl });
  };

  const handleDeleteLogo = async () => {
    if (!form.logoUrl) return;

    const parts = form.logoUrl.split('/');
    const fileName = parts.slice(parts.indexOf('logos')).join('/');
    
    const { error: deleteError } = await supabase.storage
      .from('logos')
      .remove([fileName]);

    if (deleteError) {
      console.error('Erro ao deletar logo:', deleteError);
      setError(deleteError.message);
    } else {
      setForm({ ...form, logoUrl: '' });
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-2xl font-bold mb-4">Configurações da Empresa</h1>
      <div className="p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Dados Atuais:</h2>
        <p><strong>Nome:</strong> {form.nome || '-'}</p>
        <p><strong>CNPJ:</strong> {form.cnpj || '-'}</p>
        <p><strong>Endereço:</strong> {form.endereco || '-'}</p>
        <p><strong>Telefone:</strong> {form.telefone || '-'}</p>
        <p><strong>Email:</strong> {form.email || '-'}</p>
        <p><strong>Website:</strong> {form.website || '-'}</p>
        <p><strong>Logo:</strong> {form.logoUrl ? <a href={form.logoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver Logo</a> : '-'}</p>
        {form.logoUrl && (
          <div className="mt-2">
            <img src={form.logoUrl} alt="Logo" className="h-20" />
            {isEditing && (
              <button 
                type="button"
                onClick={handleDeleteLogo}
                className="text-red-500 text-sm mt-1"
              >
                Deletar Logo
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 mb-2">Erro: {error}</p>}
      {loading && <p className="text-gray-500 mb-2">Salvando...</p>}
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="px-4 py-2 bg-gray-500 text-white rounded"
      >
        {isEditing ? 'Cancelar Edição' : 'Editar'}
      </button>
      <form onSubmit={handleSubmit} className="space-y-5">
        {Object.entries({
          nome: 'Nome da Empresa',
          cnpj: 'CNPJ',
          endereco: 'Endereço',
          logoUrl: 'URL da Logo',
          telefone: 'Telefone',
          email: 'Email',
          website: 'Website'
        }).map(([field, label]) => (
          <div key={field} className="flex flex-col">
            <label htmlFor={field} className="mb-1 font-medium">{label}</label>
            <input
              id={field}
              name={field}
              value={(form as Record<string, string>)[field]}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              disabled={!isEditing}
            />
          </div>
        ))}
        {/* Upload da Logo */}
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Upload da Logo</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={!isEditing} />
        </div>
        <div className="pt-2 border-t mt-6 flex justify-end">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={!isEditing}>
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}