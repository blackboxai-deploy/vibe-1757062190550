"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("ai-eval-auth");
    const session = localStorage.getItem("ai-eval-session");
    
    if (!auth || !session) {
      router.push("/login");
      return;
    }

    // Check if session is still valid (24 hours)
    const sessionTime = parseInt(session);
    const now = Date.now();
    const hoursPassed = (now - sessionTime) / (1000 * 60 * 60);
    
    if (hoursPassed > 24) {
      localStorage.removeItem("ai-eval-auth");
      localStorage.removeItem("ai-eval-session");
      router.push("/login");
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("ai-eval-auth");
    localStorage.removeItem("ai-eval-session");
    router.push("/login");
  };

  const navigateToTool = (tool: string) => {
    router.push(`/tools/${tool}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Plateforme d'Évaluation IA
              </h1>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connecté
              </Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Tableau de bord professeur
          </h2>
          <p className="mt-2 text-gray-600">
            Choisissez l'outil d'évaluation que vous souhaitez utiliser
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool 1: Code Evaluation */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-indigo-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-indigo-900">
                  Évaluation de Code
                </CardTitle>
                <Badge className="bg-indigo-100 text-indigo-800">
                  Outil 1
                </Badge>
              </div>
              <CardDescription>
                Génération automatique de 10 questions contextuelles sur le code étudiant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Questions personnalisées avec contexte
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Évaluation automatique des réponses
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Score sur 100 points
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigateToTool('code-evaluation')}
              >
                Accéder à l'outil
              </Button>
            </CardContent>
          </Card>

          {/* Tool 2: Code Analysis */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-green-900">
                  Analyse de Code
                </CardTitle>
                <Badge className="bg-green-100 text-green-800">
                  Outil 2
                </Badge>
              </div>
              <CardDescription>
                Analyse automatique avec recommandations d'amélioration du code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Comparaison avec spécifications
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Recommandations d'amélioration
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Questions d'aide pour externes
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => navigateToTool('code-analysis')}
              >
                Accéder à l'outil
              </Button>
            </CardContent>
          </Card>

          {/* Tool 3: QCM Generator */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-purple-900">
                  Générateur QCM
                </CardTitle>
                <Badge className="bg-purple-100 text-purple-800">
                  ExamAI
                </Badge>
              </div>
              <CardDescription>
                Création automatique de QCM à partir de sujets LaTeX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Génération depuis sujet LaTeX
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  QCM aléatoires anti-triche
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Système skip/report intégré
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                onClick={() => navigateToTool('qcm-generator')}
              >
                Accéder à l'outil
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informations techniques
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p><strong>Modèle IA :</strong> Claude Sonnet 4 via OpenRouter</p>
              <p><strong>Température :</strong> 0.5 (réduction des hallucinations)</p>
              <p><strong>Format :</strong> Toutes les réponses en JSON</p>
            </div>
            <div>
              <p><strong>Langues supportées :</strong> Français, Anglais</p>
              <p><strong>Scoring :</strong> Système de notation sur 100</p>
              <p><strong>Session :</strong> Valide 24 heures</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}