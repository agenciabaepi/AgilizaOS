import type { IconType } from 'react-icons';
import {
  FiLayout,
  FiBriefcase,
  FiFileText,
  FiDollarSign,
  FiUsers,
  FiSettings,
  FiMessageSquare,
  FiBell,
  FiSmartphone,
  FiPackage,
  FiCheckSquare,
  FiDroplet,
  FiPercent,
} from 'react-icons/fi';

export type AdminSaasNavLink = {
  href: string;
  label: string;
  icon: IconType;
};

/** Links do menu lateral do Admin SaaS — fonte única para evitar divergência SSR/cliente. */
export const ADMIN_SAAS_NAV_LINKS: AdminSaasNavLink[] = [
  { href: '/admin-saas', label: 'Visão geral', icon: FiLayout },
  { href: '/admin-saas/empresas', label: 'Empresas', icon: FiBriefcase },
  { href: '/admin-saas/assinaturas', label: 'Assinaturas', icon: FiFileText },
  { href: '/admin-saas/pagamentos', label: 'Pagamentos', icon: FiDollarSign },
  { href: '/admin-saas/tickets', label: 'Tickets', icon: FiMessageSquare },
  { href: '/admin-saas/notificacoes', label: 'Notificações', icon: FiBell },
  { href: '/admin-saas/usuarios', label: 'Usuários', icon: FiUsers },
  { href: '/admin-saas/tipos-equipamento', label: 'Tipos equip.', icon: FiPackage },
  { href: '/admin-saas/aparelhos', label: 'Aparelhos', icon: FiSmartphone },
  { href: '/admin-saas/cores', label: 'Cores', icon: FiDroplet },
  { href: '/admin-saas/checklist', label: 'Checklist', icon: FiCheckSquare },
  { href: '/admin-saas/planos', label: 'Planos e preços', icon: FiSettings },
  { href: '/admin-saas/cupons', label: 'Cupons', icon: FiPercent },
];
