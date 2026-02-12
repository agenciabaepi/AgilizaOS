'use client';

import { useState, ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  className = ''
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors text-left min-h-[72px] sm:min-h-0"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-600">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-1 break-words">{subtitle}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-4 pt-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

