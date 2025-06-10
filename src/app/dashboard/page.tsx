"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirect = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: tecnico } = await supabase
        .from("tecnicos")
        .select("nivel")
        .eq("auth_user_id", session.user.id)
        .single();

      if (tecnico) {
        if (tecnico.nivel === "tecnico") {
          router.replace("/bancada");
        } else {
          router.replace("/dashboard/admin");
        }
      } else {
        router.replace("/dashboard/admin");
      }
    };

    redirect().finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500 text-lg">Carregando dashboard...</p>
    </div>
  );
}