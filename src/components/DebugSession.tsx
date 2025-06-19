'use client';

import { useEffect, useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient();

export default function DebugSession() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setUserInfo(data.session?.user || error);
    };

    fetchSession();
  }, []);

  return (
    <pre className="text-xs bg-gray-100 p-4 mt-4 rounded">
      {JSON.stringify(userInfo, null, 2)}
    </pre>
  );
}