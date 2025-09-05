"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Check passcode
    if (passcode === "422025") {
      // Set authentication session
      localStorage.setItem("ai-eval-auth", "true");
      localStorage.setItem("ai-eval-session", Date.now().toString());
      router.push("/dashboard");
    } else {
      setError("Code d'accès incorrect. Veuillez réessayer.");
      setPasscode("");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Plateforme d'Évaluation IA
          </CardTitle>
          <CardDescription className="text-gray-600">
            Accès réservé aux professeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="passcode" className="text-sm font-medium text-gray-700">
                Code d'accès professeur
              </label>
              <Input
                id="passcode"
                type="password"
                placeholder="Entrez votre code d'accès"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-700">Outils disponibles :</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Évaluation de code avec questions</li>
                <li>• Analyse de code et recommandations</li>
                <li>• Générateur de QCM (ExamAI)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}