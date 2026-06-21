'use client';

import { useMemo, useState } from 'react';
import { Search, Shield, ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  PERMISSION_GROUPS,
  hasGrantableKey,
  getAllGrantableKeys,
  type PermissionGroup,
  type PermissaoItem,
} from '@/config/grantablePermissions';
import { togglePermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const GROUP_COLORS: Record<
  PermissionGroup['color'],
  { border: string; bg: string; badge: string; ring: string; subBorder: string }
> = {
  gray: { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'bg-gray-900 text-white', ring: 'focus:ring-gray-900', subBorder: 'border-gray-200' },
  blue: { border: 'border-blue-300', bg: 'bg-blue-50', badge: 'bg-blue-600 text-white', ring: 'focus:ring-blue-600', subBorder: 'border-blue-200' },
  green: { border: 'border-green-300', bg: 'bg-green-50', badge: 'bg-green-600 text-white', ring: 'focus:ring-green-600', subBorder: 'border-green-200' },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50', badge: 'bg-purple-600 text-white', ring: 'focus:ring-purple-600', subBorder: 'border-purple-200' },
  amber: { border: 'border-amber-300', bg: 'bg-amber-50', badge: 'bg-amber-600 text-white', ring: 'focus:ring-amber-600', subBorder: 'border-amber-200' },
  teal: { border: 'border-teal-300', bg: 'bg-teal-50', badge: 'bg-teal-600 text-white', ring: 'focus:ring-teal-600', subBorder: 'border-teal-200' },
  rose: { border: 'border-rose-300', bg: 'bg-rose-50', badge: 'bg-rose-600 text-white', ring: 'focus:ring-rose-600', subBorder: 'border-rose-200' },
};

type Props = {
  permissoes: string[];
  onChange: (permissoes: string[]) => void;
  disabled?: boolean;
  onDashboardLocked?: () => void;
};

function countGroupActive(group: PermissionGroup, permissoes: string[]): { active: number; total: number } {
  let total = 0;
  let active = 0;

  group.entries.forEach((entry) => {
    if (entry.type === 'standalone') {
      total += 1;
      if (hasGrantableKey(permissoes, entry.item.key)) active += 1;
    } else {
      total += 1 + entry.sub.length;
      if (hasGrantableKey(permissoes, entry.principal.key)) active += 1;
      entry.sub.forEach((sub) => {
        if (hasGrantableKey(permissoes, sub.key)) active += 1;
      });
    }
  });

  return { active, total };
}

function PermissionToggle({
  item,
  checked,
  disabled,
  isSub,
  colors,
  onToggle,
}: {
  item: PermissaoItem;
  checked: boolean;
  disabled?: boolean;
  isSub?: boolean;
  colors: (typeof GROUP_COLORS)[PermissionGroup['color']];
  onToggle: () => void;
}) {
  const isDashboard = item.key === 'dashboard';

  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border transition-all',
        isSub ? 'px-3 py-2' : 'p-3',
        isDashboard && 'cursor-not-allowed border-green-400 bg-green-50/80',
        !isDashboard && !disabled && 'cursor-pointer hover:border-gray-400',
        !isDashboard && checked && !isSub && `${colors.border} ${colors.bg}`,
        !isDashboard && !checked && !isSub && 'border-gray-200 bg-white',
        !isDashboard && isSub && checked && 'border-gray-300 bg-white',
        !isDashboard && isSub && !checked && 'border-transparent bg-transparent',
        disabled && !isDashboard && 'opacity-60 cursor-not-allowed'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || isDashboard}
        onChange={onToggle}
        className={cn('mt-0.5 rounded border-gray-300', colors.ring, isSub ? 'h-3.5 w-3.5' : 'h-4 w-4')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('font-medium text-gray-900', isSub ? 'text-sm' : 'text-sm')}>
            {item.label}
          </span>
          {isDashboard && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
              Obrigatório
            </span>
          )}
        </div>
        {!isSub && item.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
    </label>
  );
}

export default function PermissionsEditor({
  permissoes,
  onChange,
  disabled,
  onDashboardLocked,
}: Props) {
  const [busca, setBusca] = useState('');
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, true]))
  );

  const totalAtivas = permissoes.filter((k) => getAllGrantableKeys().includes(k)).length;
  const totalKeys = getAllGrantableKeys().length;

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return PERMISSION_GROUPS;

    return PERMISSION_GROUPS.map((group) => {
      const entries = group.entries.filter((entry) => {
        if (entry.type === 'standalone') {
          return (
            entry.item.label.toLowerCase().includes(termo) ||
            entry.item.description.toLowerCase().includes(termo)
          );
        }
        return (
          entry.principal.label.toLowerCase().includes(termo) ||
          entry.principal.description.toLowerCase().includes(termo) ||
          entry.sub.some(
            (s) =>
              s.label.toLowerCase().includes(termo) ||
              s.description.toLowerCase().includes(termo)
          )
        );
      });
      return entries.length ? { ...group, entries } : null;
    }).filter(Boolean) as PermissionGroup[];
  }, [busca]);

  const handleToggle = (key: string) => {
    if (key === 'dashboard') {
      onDashboardLocked?.();
      return;
    }
    const enabled = !hasGrantableKey(permissoes, key);
    onChange(togglePermission(permissoes, key, enabled));
  };

  const toggleGrupo = (groupId: string) => {
    setGruposAbertos((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const marcarGrupo = (group: PermissionGroup, enabled: boolean) => {
    let next = [...permissoes];
    group.entries.forEach((entry) => {
      if (entry.type === 'standalone') {
        next = togglePermission(next, entry.item.key, enabled);
      } else {
        next = togglePermission(next, entry.principal.key, enabled);
      }
    });
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Permissões de acesso</h3>
            <p className="text-xs text-gray-500">
              {totalAtivas} de {totalKeys} módulos ativos
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar módulo..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gray-900 transition-all duration-300"
          style={{ width: `${Math.round((totalAtivas / totalKeys) * 100)}%` }}
        />
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {gruposFiltrados.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Nenhum módulo encontrado.</p>
        ) : (
          gruposFiltrados.map((group) => {
            const colors = GROUP_COLORS[group.color];
            const { active, total } = countGroupActive(group, permissoes);
            const aberto = gruposAbertos[group.id] ?? true;
            const todosAtivos = active === total;

            return (
              <div key={group.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(group.id)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    {aberto ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{group.label}</span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors.badge)}>
                          {active}/{total}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{group.description}</p>
                    </div>
                  </button>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => marcarGrupo(group, !todosAtivos)}
                      className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      {todosAtivos ? 'Desmarcar' : 'Marcar todos'}
                      {!todosAtivos && <Check className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {aberto && (
                  <div className="p-4 space-y-3">
                    {group.entries.map((entry) => {
                      if (entry.type === 'standalone') {
                        return (
                          <PermissionToggle
                            key={entry.item.key}
                            item={entry.item}
                            checked={hasGrantableKey(permissoes, entry.item.key)}
                            disabled={disabled}
                            colors={colors}
                            onToggle={() => handleToggle(entry.item.key)}
                          />
                        );
                      }

                      const principalAtivo = hasGrantableKey(permissoes, entry.principal.key);

                      return (
                        <div key={entry.principal.key} className="space-y-2">
                          <PermissionToggle
                            item={entry.principal}
                            checked={principalAtivo}
                            disabled={disabled}
                            colors={colors}
                            onToggle={() => handleToggle(entry.principal.key)}
                          />
                          {principalAtivo && entry.sub.length > 0 && (
                            <div className={cn('ml-4 pl-3 border-l-2 space-y-1', colors.subBorder)}>
                              {entry.sub.map((sub) => (
                                <PermissionToggle
                                  key={sub.key}
                                  item={sub}
                                  checked={hasGrantableKey(permissoes, sub.key)}
                                  disabled={disabled}
                                  isSub
                                  colors={colors}
                                  onToggle={() => handleToggle(sub.key)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Dica:</strong> marcar um módulo principal inclui automaticamente suas sub-opções.
          Você pode desmarcar sub-opções individualmente depois. O <strong>Dashboard</strong> é
          sempre obrigatório. Usuários com permissões restritas só acessam rotas dos módulos marcados.
        </p>
      </div>
    </div>
  );
}
