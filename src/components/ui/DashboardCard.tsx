import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  colorClass?: string; // ex: 'text-green-500', 'text-blue-500'
  bgClass?: string; // ex: 'bg-green-50'
  description?: string;
  descriptionColorClass?: string; // ex: 'text-green-500'
  descriptionIcon?: React.ReactNode;
  /**
   * Sparkline: prefira `strokeClass` (currentColor) para bom contraste no escuro.
   * `color` (hex) mantém compatibilidade com telas antigas.
   */
  svgPolyline?: { points: string; strokeClass?: string; color?: string };
  children?: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  value,
  icon,
  colorClass = 'text-black',
  bgClass = 'bg-white',
  description,
  descriptionColorClass = '',
  descriptionIcon,
  svgPolyline,
  children,
  className,
}: DashboardCardProps) {
  return (
    <div className={cn('bg-white dark:bg-zinc-900 rounded-xl shadow-md dark:shadow-none p-3 relative overflow-hidden flex flex-col gap-1 border border-gray-100 dark:border-zinc-600', bgClass, colorClass, className)}>
      <h3 className="text-gray-600 dark:text-zinc-300 text-sm mb-0 font-medium flex items-center gap-2 [&_svg]:opacity-90 dark:[&_svg]:opacity-100">
        {icon}
        {title}
      </h3>
      <div className="text-2xl font-bold text-black dark:text-zinc-100 leading-tight">{value}</div>
      {description && (
        <div className={cn('text-xs mt-1 flex items-center gap-1', descriptionColorClass)}>
          {descriptionIcon}
          <span>{description}</span>
        </div>
      )}
      {children}
      {svgPolyline && (
        <div
          className={cn(
            'absolute bottom-2 right-2 pointer-events-none',
            svgPolyline.strokeClass
              ? cn('opacity-[0.55] dark:opacity-100', svgPolyline.strokeClass)
              : 'opacity-[0.5] dark:opacity-100 dark:brightness-125'
          )}
          aria-hidden
        >
          <svg width="80" height="24" className="overflow-visible">
            <polyline
              fill="none"
              stroke={svgPolyline.strokeClass ? 'currentColor' : svgPolyline.color ?? '#65a30d'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPolyline.points}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default DashboardCard; 