'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import ClienteForm from '../../../../../components/ClienteForm';

interface Cliente {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  celular: string;
  email: string;
  responsavel: string;
  tipo: string;
  origem: string;
  aniversario: string;
  cep: string;
  endereco: string;
  observacoes: string;
}

export default function EditarClientePage() {
  const params = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', params?.id ?? '')
        .single();
      setCliente(data);
    };
    fetchCliente();
  }, [params?.id]);

  if (!cliente) return <p>Carregando...</p>;

  return <ClienteForm cliente={{
    ...cliente,
    nome: cliente.nome ?? '',
    documento: cliente.documento ?? '',
    telefone: cliente.telefone ?? '',
    celular: cliente.celular ?? '',
    email: cliente.email ?? '',
    responsavel: cliente.responsavel ?? '',
    tipo: cliente.tipo ?? '',
    origem: cliente.origem ?? '',
    aniversario: cliente.aniversario ?? '',
    cep: cliente.cep ?? '',
    observacoes: cliente.observacoes ?? '',
  }} />;
}