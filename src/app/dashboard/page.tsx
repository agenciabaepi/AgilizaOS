"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (user?.tipo === "tecnico") {
      router.push("/pages/dashboard/tecnico");
    } else {
      router.push("/pages/dashboard/admin");
    }
  }, [router]);

  return null;
}