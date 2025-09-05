"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const auth = localStorage.getItem("ai-eval-auth");
    const session = localStorage.getItem("ai-eval-session");
    
    if (auth && session) {
      // Check if session is still valid (24 hours)
      const sessionTime = parseInt(session);
      const now = Date.now();
      const hoursPassed = (now - sessionTime) / (1000 * 60 * 60);
      
      if (hoursPassed <= 24) {
        router.push("/dashboard");
        return;
      } else {
        // Session expired, clean up
        localStorage.removeItem("ai-eval-auth");
        localStorage.removeItem("ai-eval-session");
      }
    }
    
    // Redirect to login
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement de la plateforme...</p>
      </div>
    </div>
  );
}