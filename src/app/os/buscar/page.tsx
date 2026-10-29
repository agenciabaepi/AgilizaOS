'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiSearch, FiSmartphone, FiCalendar, FiLock, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

export default function BuscarOSPage() {
  const [numeroOS, setNumeroOS] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroOS.trim()) return;

    setLoading(true);
    router.push(`/os/${numeroOS.trim()}/status`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Image
            src={isDark ? '/assets/imagens/logobranco.png' : '/assets/imagens/logopreto.png'}
            alt="Consert"
            width={130}
            height={42}
            className="h-8 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-500 dark:text-zinc-400">
              Acompanhamento de OS
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-zinc-700 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Acompanhar OS
            </h1>
            <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base mt-2">
              Digite o número da sua ordem de serviço para ver o status do reparo.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6 sm:p-8 mb-6">
            <form onSubmit={handleSearch} className="space-y-5">
              <div>
                <label htmlFor="numeroOS" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  Número da OS
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-5 h-5" />
                  <input
                    type="text"
                    id="numeroOS"
                    value={numeroOS}
                    onChange={(e) => setNumeroOS(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-gray-900 dark:focus:border-zinc-400 focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-zinc-400/20 transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !numeroOS.trim()}
                className="w-full bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-white focus:ring-2 focus:ring-gray-500 dark:focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Buscando...' : 'Acompanhar OS'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-5 text-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FiSmartphone className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm mb-1">Status do aparelho</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400">Acompanhe o andamento do reparo em tempo real</p>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-5 text-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FiCalendar className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm mb-1">Datas e previsão</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400">Veja abertura e previsão de entrega</p>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-5 text-center">
              <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FiLock className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm mb-1">Acesso seguro</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400">Senha do recibo protege seus dados</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block h-2 w-2 rounded-full bg-[#D1FE6E]" aria-hidden />
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">Como usar</h3>
            </div>
            <ol className="text-sm text-gray-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
              <li>Digite o número da OS que está no seu recibo</li>
              <li>Clique em &quot;Acompanhar OS&quot;</li>
              <li>Informe a senha de acesso impressa no recibo</li>
              <li>Veja status, fotos, laudo e orçamento</li>
            </ol>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <span>Powered by</span>
          <span className="font-semibold text-gray-900 dark:text-zinc-100">Consert</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D1FE6E]" aria-hidden />
        </div>
      </footer>
    </div>
  );
}
