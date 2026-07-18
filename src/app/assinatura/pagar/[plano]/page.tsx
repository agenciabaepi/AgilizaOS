'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MenuLayout from '@/components/MenuLayout';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import PixQRCode from '@/components/PixQRCode';
import CupomDescontoInput, { type CupomAplicado } from '@/components/billing/CupomDescontoInput';
import { Button } from '@/components/Button';
import { formatarValorAssinatura, usePlanosPublicos } from '@/hooks/usePlanosPublicos';
import { PLANO_SLUGS, PREMIUM_MODULES, premiumModuleLabelWithStatus, type PlanoSlug } from '@/config/planModules';
import { FiArrowLeft } from 'react-icons/fi';

function PagarPlanoSkeleton() {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse" aria-busy="true">
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-full bg-gray-100 dark:bg-zinc-700 rounded" />
        <div className="rounded-xl border p-5 h-40 bg-gray-50 dark:bg-zinc-900" />
      </div>
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-4">
        <div className="h-6 w-40 bg-gray-200 dark:bg-zinc-700 rounded" />
        <div className="rounded-xl border p-5 h-48 bg-gray-50 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function AssinaturaPagarPlanoPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();
  const slugParam = String(params?.plano ?? '');
  const { basico, completo, ready } = usePlanosPublicos();
  const mock = search?.get('mock') === '1';
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [pixGerado, setPixGerado] = useState(false);

  const slug =
    slugParam === PLANO_SLUGS.BASICO || slugParam === PLANO_SLUGS.COMPLETO
      ? (slugParam as PlanoSlug)
      : null;

  const planoDb = slug === PLANO_SLUGS.BASICO ? basico : slug === PLANO_SLUGS.COMPLETO ? completo : null;

  const plano =
    ready && slug && planoDb
      ? {
          id: slug,
          nome: planoDb.nome,
          descricao: planoDb.descricao,
          valor: planoDb.preco,
          personalizado: planoDb.personalizado === true,
          precoCatalogo: planoDb.preco_catalogo,
          premium: slug === PLANO_SLUGS.COMPLETO,
        }
      : null;

  const valorFinal = cupom?.valor_final ?? plano?.valor ?? 0;

  return (
    <AuthGuardFinal>
      <MenuLayout>
        <div className="max-w-5xl mx-auto py-6 px-4">
          <Button
            variant="outline"
            onClick={() => router.push('/assinatura')}
            className="mb-6 border-gray-300 dark:border-zinc-600"
          >
            <FiArrowLeft className="mr-2" />
            Voltar à assinatura
          </Button>

          {!slug && ready && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Plano inválido.</p>
              <Button onClick={() => router.push('/assinatura')}>Ver planos</Button>
            </div>
          )}

          {!plano ? (
            <PagarPlanoSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Pagamento do plano</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Confirme e pague com PIX</p>

                <div className="rounded-xl border border-gray-200 dark:border-zinc-600 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-lg text-gray-900 dark:text-white">{plano.nome}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plano.descricao}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {cupom ? (
                        <>
                          <div className="text-sm text-gray-400 line-through">
                            R$ {formatarValorAssinatura(plano.valor)}
                          </div>
                          <div className="text-green-700 dark:text-green-400 font-extrabold text-2xl">
                            R$ {formatarValorAssinatura(valorFinal)}
                          </div>
                        </>
                      ) : (
                        <div className="text-green-700 dark:text-green-400 font-extrabold text-2xl">
                          R$ {formatarValorAssinatura(plano.valor)}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500">mensal</div>
                      {plano.personalizado && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                          Valor personalizado
                        </div>
                      )}
                    </div>
                  </div>
                  <ul className="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <li>✓ Sistema completo de gestão</li>
                    {plano.premium ? (
                      Object.values(PREMIUM_MODULES).map((m) => (
                        <li key={m.label}>✓ {premiumModuleLabelWithStatus(m)}</li>
                      ))
                    ) : (
                      <li>✓ Sem módulos premium (upgrade disponível depois)</li>
                    )}
                    <li>✓ Ativação automática após confirmação do PIX</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pagamento via PIX</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Rápido, seguro e sem taxas</p>

                <div className="mb-4">
                  <CupomDescontoInput
                    planoSlug={plano.id as PlanoSlug}
                    valorOriginal={plano.valor}
                    disabled={pixGerado}
                    onApplied={setCupom}
                    onClear={() => setCupom(null)}
                  />
                </div>

                <PixQRCode
                  valor={valorFinal}
                  descricao={`Plano ${plano.nome}`}
                  planoSlug={plano.id}
                  cupomCodigo={cupom?.codigo ?? null}
                  mock={mock}
                  onPixCreated={() => setPixGerado(true)}
                  onSuccess={() => router.push('/dashboard')}
                />
              </div>
            </div>
          )}
        </div>
      </MenuLayout>
    </AuthGuardFinal>
  );
}
