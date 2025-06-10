"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MenuLayout from "@/components/MenuLayout";

export default function TecnicoDashboardPage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    } else if (session.user.email === "lucas@hotmail.com") {
      router.replace("/dashboard/admin");
    }
  }, [session]);

  if (!session || session.user.email === "lucas@hotmail.com") return null;

  return (
    <MenuLayout>
      <div>
        <h1>Dashboard do Técnico</h1>
      </div>
    </MenuLayout>
  );
}
