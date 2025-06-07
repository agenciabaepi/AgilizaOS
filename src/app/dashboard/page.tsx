"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (!userString) {
        router.push("/login");
        return;
      }

      const user = JSON.parse(userString);

      if (user?.nivel === "admin") {
        router.push("/dashboard/admin");
      } else if (user?.nivel === "tecnico") {
        router.push("/dashboard/tecnico");
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500 text-lg">Carregando dashboard...</p>
    </div>
  );
}