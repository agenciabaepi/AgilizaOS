'use client';

import { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';

export default function ClientToaster() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: isDark ? 'dark-toast' : '',
        style: isDark
          ? {
              background: '#27272a',
              color: '#fafafa',
              border: '1px solid #52525b',
            }
          : undefined,
        success: {
          iconTheme: isDark
            ? { primary: '#4ade80', secondary: '#14532d' }
            : undefined,
        },
        error: {
          iconTheme: isDark
            ? { primary: '#f87171', secondary: '#7f1d1d' }
            : undefined,
        },
      }}
    />
  );
}
