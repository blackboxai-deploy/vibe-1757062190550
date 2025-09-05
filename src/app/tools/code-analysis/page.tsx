"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalysisResult {
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  compliance: {
    score: number;
    details: string;
  };
  help_questions: {
    question: string;
    context: string;
  }[];
}

export default function CodeAnalysisPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<'setup' | 'results'>('setup');
  const [code, setCode] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("ai-eval-auth");
    if (!auth) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Veuillez entrer du code à analyser');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openrouter/anthropic/claude-sonnet-4',
          messages: [
            {
              role: 'user',
              content: `Analyse ce code ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n${specifications ? `Spécifications du projet:\n${specifications}\n\n` : ''}Fournis une analyse détaillée avec recommandations et questions d'aide pour les externes.`
            }
          ],
          temperature: 0.5,
          tool: 'code-analysis'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      if (data.data && data.data.analysis) {
        setAnalysisResult(data.data);
        setStep('results');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setStep('setup');
    setCode('');
    setSpecifications('');
    setAnalysisResult(null);
    setError('');
  };

  const exportReport = () => {
    if (!analysisResult) return;

    const report = {
      timestamp: new Date().toISOString(),
      language,
      code,
      specifications,
      analysis: analysisResult
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-analysis-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                ← Retour
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Analyse de Code
              </h1>
              <Badge className="bg-green-100 text-green-800">Outil 2</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {step === 'setup' && (
          <Card>
            <CardHeader>
              <CardTitle>Analyse automatique de code</CardTitle>
              <CardDescription>
                Analysez le code de l'étudiant et obtenez des recommandations d'amélioration avec conformité aux spécifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Langage de programmation
                  </label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="php">PHP</option>
                    <option value="html">HTML/CSS</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code de l'étudiant
                </label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Collez ici le code à analyser..."
                  className="h-64 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spécifications du projet (optionnel)
                </label>
                <Textarea
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  placeholder="Décrivez les spécifications, contraintes, ou normes à respecter..."
                  className="h-32"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Les spécifications aident à analyser la conformité du code aux exigences du projet
                </p>
              </div>

              <Button 
                onClick={analyzeCode}
                disabled={loading || !code.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Analyse en cours...' : 'Analyser le code'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'results' && analysisResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Résultats de l'analyse</CardTitle>
                    <CardDescription>
                      Analyse détaillée avec recommandations et questions d'aide
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={exportReport}>
                      Exporter le rapport
                    </Button>
                    <Button variant="outline" onClick={resetAnalysis}>
                      Nouvelle analyse
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-green-600">
                    Score de conformité: {analysisResult.compliance.score}%
                  </div>
                  <Progress value={analysisResult.compliance.score} className="mt-2 max-w-md mx-auto" />
                  <p className="text-gray-600 mt-2">
                    {analysisResult.compliance.details}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">Analyse</TabsTrigger>
                <TabsTrigger value="help">Questions d'aide</TabsTrigger>
                <TabsTrigger value="code">Code analysé</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analysis">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Strengths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">Points forts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.analysis.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                            <span className="text-sm text-gray-700">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-700">Points à améliorer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.analysis.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                            <span className="text-sm text-gray-700">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-700">Recommandations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.analysis.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                            <span className="text-sm text-gray-700">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="help">
                <Card>
                  <CardHeader>
                    <CardTitle>Questions d'aide pour externes</CardTitle>
                    <CardDescription>
                      Ces questions aident une personne externe à comprendre le code sans le lire en détail
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisResult.help_questions.map((item, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {item.question}
                          </h4>
                          <p className="text-sm text-gray-600">
                            <strong>Contexte:</strong> {item.context}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="code">
                <Card>
                  <CardHeader>
                    <CardTitle>Code analysé</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm">
                        <code>{code}</code>
                      </pre>
                    </div>
                    {specifications && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Spécifications:</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {specifications}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}