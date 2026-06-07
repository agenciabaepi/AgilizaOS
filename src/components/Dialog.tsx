import React, { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  /** Em telas pequenas, abre como bottom sheet com scroll */
  mobileBottomSheet?: boolean;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  onClose,
  mobileBottomSheet = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-black/40',
        mobileBottomSheet
          ? 'items-end sm:items-center justify-center p-0 sm:p-4'
          : 'items-center justify-center p-4'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white shadow-lg relative',
          mobileBottomSheet
            ? 'w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] sm:w-auto sm:max-w-md sm:max-h-[90vh] sm:rounded-xl sm:pb-0'
            : 'rounded-xl w-auto max-w-full',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {mobileBottomSheet && (
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
          </div>
        )}
        <button
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          aria-label="Fechar"
        >
          <FiX size={20} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Dialog; 