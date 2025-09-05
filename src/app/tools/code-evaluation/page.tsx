"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  points: number;
}

interface Evaluation {
  question_id: number;
  score: number;
  max_score: number;
  feedback: string;
}

interface EvaluationResult {
  evaluations: Evaluation[];
  total_score: number;
  total_possible: number;
  percentage: number;
  general_feedback: string;
}

export default function CodeEvaluationPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<'upload' | 'questions' | 'results'>('upload');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("ai-eval-auth");
    if (!auth) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const generateQuestions = async () => {
    if (!code.trim()) {
      setError('Veuillez entrer du code à évaluer');
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
              content: `Analyse ce code ${language} et génère 10 questions d'évaluation:\n\n\`\`\`${language}\n${code}\n\`\`\``
            }
          ],
          temperature: 0.5,
          tool: 'code-evaluation'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      if (data.data && data.data.questions) {
        setQuestions(data.data.questions);
        setStep('questions');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswers = async () => {
    setLoading(true);
    setError('');

    try {
      const questionsWithAnswers = questions.map(q => ({
        ...q,
        student_answer: answers[q.id] || ''
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openrouter/anthropic/claude-sonnet-4',
          messages: [
            {
              role: 'user',
              content: `Code original:\n\`\`\`${language}\n${code}\n\`\`\`\n\nQuestions et réponses de l'étudiant:\n${JSON.stringify(questionsWithAnswers, null, 2)}\n\nÉvalue chaque réponse et donne une note détaillée.`
            }
          ],
          temperature: 0.5,
          tool: 'code-evaluation-grade'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'évaluation');
      }

      if (data.data && data.data.evaluations) {
        setEvaluationResult(data.data);
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

  const resetEvaluation = () => {
    setStep('upload');
    setCode('');
    setQuestions([]);
    setAnswers({});
    setEvaluationResult(null);
    setError('');
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
                Évaluation de Code
              </h1>
              <Badge className="bg-indigo-100 text-indigo-800">Outil 1</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>1. Téléchargement du code</CardTitle>
              <CardDescription>
                Collez le code de l'étudiant pour générer automatiquement 10 questions d'évaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Langage de programmation
                </label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code de l'étudiant
                </label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Collez ici le code à évaluer..."
                  className="h-80 font-mono text-sm"
                />
              </div>

              <Button 
                onClick={generateQuestions}
                disabled={loading || !code.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Génération des questions...' : 'Générer les questions d\'évaluation'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'questions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>2. Questions d'évaluation</CardTitle>
                <CardDescription>
                  Répondez aux 10 questions générées automatiquement sur le code
                </CardDescription>
              </CardHeader>
            </Card>

            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      Question {index + 1} ({question.points} points)
                    </CardTitle>
                    <Badge variant={
                      question.difficulty === 'facile' ? 'secondary' :
                      question.difficulty === 'moyen' ? 'default' : 'destructive'
                    }>
                      {question.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {question.question}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers(prev => ({
                      ...prev,
                      [question.id]: e.target.value
                    }))}
                    placeholder="Votre réponse..."
                    className="min-h-24"
                  />
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetEvaluation}>
                Recommencer
              </Button>
              <Button 
                onClick={evaluateAnswers}
                disabled={loading || Object.keys(answers).length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Évaluation en cours...' : 'Évaluer les réponses'}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && evaluationResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3. Résultats de l'évaluation</CardTitle>
                <CardDescription>
                  Analyse détaillée des réponses avec scores et commentaires
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-indigo-600">
                    {evaluationResult.percentage}%
                  </div>
                  <div className="text-gray-600">
                    {evaluationResult.total_score}/{evaluationResult.total_possible} points
                  </div>
                  <Progress value={evaluationResult.percentage} className="mt-2" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Commentaire général</h3>
                  <p className="text-gray-700">{evaluationResult.general_feedback}</p>
                </div>
              </CardContent>
            </Card>

            {evaluationResult.evaluations.map((evaluation, index) => (
              <Card key={evaluation.question_id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      Question {index + 1}
                    </CardTitle>
                    <Badge variant={evaluation.score >= evaluation.max_score * 0.7 ? 'secondary' : 'destructive'}>
                      {evaluation.score}/{evaluation.max_score}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Question:</h4>
                      <p className="text-gray-700">{questions[index]?.question}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Réponse:</h4>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded">
                        {answers[evaluation.question_id] || 'Pas de réponse'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Commentaire:</h4>
                      <p className="text-gray-700">{evaluation.feedback}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-center">
              <Button onClick={resetEvaluation} className="bg-indigo-600 hover:bg-indigo-700">
                Nouvelle évaluation
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}