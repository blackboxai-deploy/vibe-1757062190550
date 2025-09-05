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

interface QCMOption {
  id: string;
  text: string;
}

interface QCMQuestion {
  id: number;
  question: string;
  options: QCMOption[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  competency: string;
}

interface QCMData {
  questions: QCMQuestion[];
  metadata: {
    subject: string;
    total_questions: number;
    estimated_time: string;
  };
}

interface StudentAnswer {
  question_id: number;
  selected_answer: string;
  is_correct: boolean;
  skipped: boolean;
  reported: boolean;
}

export default function QCMGeneratorPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<'setup' | 'preview' | 'exam' | 'results'>('setup');
  const [subject, setSubject] = useState('');
  const [isLatex, setIsLatex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qcmData, setQcmData] = useState<QCMData | null>(null);
  const [examQuestions, setExamQuestions] = useState<QCMQuestion[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [reportedQuestions, setReportedQuestions] = useState<Set<number>>(new Set());
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
  const [examResults, setExamResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    details: StudentAnswer[];
  } | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("ai-eval-auth");
    if (!auth) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const generateQCM = async () => {
    if (!subject.trim()) {
      setError('Veuillez entrer un sujet ou contenu à analyser');
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
              content: `Génère un QCM complet basé sur ce ${isLatex ? 'contenu LaTeX' : 'sujet'}:\n\n${subject}\n\nCrée au moins 20 questions variées avec différents niveaux de difficulté pour tester les compétences essentielles.`
            }
          ],
          temperature: 0.5,
          tool: 'qcm-generator'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      if (data.data && data.data.questions) {
        setQcmData(data.data);
        setStep('preview');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const startExam = (numQuestions: number = 10) => {
    if (!qcmData) return;
    
    // Shuffle questions and select random subset
    const shuffled = [...qcmData.questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));
    
    // Shuffle options for each question
    const examQuestions = selected.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }));
    
    setExamQuestions(examQuestions);
    setStudentAnswers({});
    setReportedQuestions(new Set());
    setSkippedQuestions(new Set());
    setStep('exam');
  };

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSkipQuestion = (questionId: number) => {
    setSkippedQuestions(prev => new Set([...prev, questionId]));
    // Remove answer if previously answered
    setStudentAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  };

  const handleReportQuestion = (questionId: number) => {
    setReportedQuestions(prev => new Set([...prev, questionId]));
  };

  const submitExam = () => {
    const results: StudentAnswer[] = examQuestions.map(q => {
      const selectedAnswer = studentAnswers[q.id];
      const isSkipped = skippedQuestions.has(q.id);
      const isReported = reportedQuestions.has(q.id);
      
      return {
        question_id: q.id,
        selected_answer: selectedAnswer || '',
        is_correct: selectedAnswer === q.correct_answer,
        skipped: isSkipped,
        reported: isReported
      };
    });

    const correctAnswers = results.filter(r => r.is_correct && !r.skipped).length;
    const totalQuestions = examQuestions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    setExamResults({
      score: correctAnswers,
      total: totalQuestions,
      percentage: score,
      details: results
    });

    setStep('results');
  };

  const resetQCM = () => {
    setStep('setup');
    setSubject('');
    setQcmData(null);
    setExamQuestions([]);
    setStudentAnswers({});
    setReportedQuestions(new Set());
    setSkippedQuestions(new Set());
    setExamResults(null);
    setError('');
  };

  const exportQCMDatabase = () => {
    if (!qcmData) return;

    const database = {
      timestamp: new Date().toISOString(),
      metadata: qcmData.metadata,
      questions: qcmData.questions,
      total_questions: qcmData.questions.length
    };

    const blob = new Blob([JSON.stringify(database, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qcm-database-${Date.now()}.json`;
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
                Générateur QCM (ExamAI)
              </h1>
              <Badge className="bg-purple-100 text-purple-800">Outil 3</Badge>
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
              <CardTitle>Générateur de QCM automatique</CardTitle>
              <CardDescription>
                Créez des questions à choix multiples à partir d'un sujet ou contenu LaTeX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isLatex}
                    onChange={(e) => setIsLatex(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Contenu au format LaTeX
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isLatex ? 'Contenu LaTeX du sujet' : 'Sujet ou contenu à analyser'}
                </label>
                <Textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={isLatex ? 
                    "Collez ici le contenu LaTeX du sujet d'examen..." :
                    "Décrivez le sujet, les concepts clés, ou collez le contenu à analyser..."
                  }
                  className="h-96 font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'IA générera automatiquement des questions basées sur les compétences à acquérir
                </p>
              </div>

              <Button 
                onClick={generateQCM}
                disabled={loading || !subject.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Génération du QCM...' : 'Générer les questions QCM'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && qcmData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>QCM généré - Aperçu</CardTitle>
                    <CardDescription>
                      {qcmData.metadata.total_questions} questions créées | 
                      Durée estimée: {qcmData.metadata.estimated_time}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={exportQCMDatabase}>
                      Exporter en JSON
                    </Button>
                    <Button variant="outline" onClick={resetQCM}>
                      Nouveau QCM
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-blue-900">Sujet: {qcmData.metadata.subject}</h3>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={() => startExam(10)} className="bg-purple-600 hover:bg-purple-700">
                    Commencer l'examen (10 questions)
                  </Button>
                  <Button variant="outline" onClick={() => startExam(20)}>
                    Examen complet (20 questions)
                  </Button>
                  <Button variant="outline" onClick={() => startExam(5)}>
                    Test rapide (5 questions)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aperçu des questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {qcmData.questions.filter(q => q.difficulty === 'facile').length}
                    </div>
                    <div className="text-sm text-green-700">Questions faciles</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {qcmData.questions.filter(q => q.difficulty === 'moyen').length}
                    </div>
                    <div className="text-sm text-orange-700">Questions moyennes</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {qcmData.questions.filter(q => q.difficulty === 'difficile').length}
                    </div>
                    <div className="text-sm text-red-700">Questions difficiles</div>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {qcmData.questions.slice(0, 5).map((question, index) => (
                    <div key={question.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">
                          {index + 1}. {question.question}
                        </h4>
                        <Badge variant={
                          question.difficulty === 'facile' ? 'secondary' :
                          question.difficulty === 'moyen' ? 'default' : 'destructive'
                        }>
                          {question.difficulty}
                        </Badge>
                      </div>
                      <div className="ml-4 space-y-1">
                        {question.options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${
                              option.id === question.correct_answer ? 'bg-green-500' : 'bg-gray-300'
                            }`}></span>
                            <span className="text-sm">{option.id}. {option.text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Compétence: {question.competency}
                      </div>
                    </div>
                  ))}
                  {qcmData.questions.length > 5 && (
                    <div className="text-center text-gray-500">
                      ... et {qcmData.questions.length - 5} autres questions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'exam' && examQuestions.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Examen en cours</CardTitle>
                <CardDescription>
                  {examQuestions.length} questions | Répondez à votre rythme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={(Object.keys(studentAnswers).length / examQuestions.length) * 100} 
                  className="mb-4" 
                />
                <div className="text-sm text-gray-600">
                  Progression: {Object.keys(studentAnswers).length}/{examQuestions.length} questions répondues
                </div>
              </CardContent>
            </Card>

            {examQuestions.map((question, index) => (
              <Card key={question.id} className={`${
                reportedQuestions.has(question.id) ? 'border-red-300 bg-red-50' : 
                skippedQuestions.has(question.id) ? 'border-yellow-300 bg-yellow-50' : 
                studentAnswers[question.id] ? 'border-green-300 bg-green-50' : ''
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      Question {index + 1}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Badge variant={
                        question.difficulty === 'facile' ? 'secondary' :
                        question.difficulty === 'moyen' ? 'default' : 'destructive'
                      }>
                        {question.difficulty}
                      </Badge>
                      {reportedQuestions.has(question.id) && (
                        <Badge variant="destructive">Signalée</Badge>
                      )}
                      {skippedQuestions.has(question.id) && (
                        <Badge variant="secondary">Sautée</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    {question.question}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {question.options.map((option) => (
                      <label 
                        key={option.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          studentAnswers[question.id] === option.id ? 'bg-purple-100 border-purple-300' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={studentAnswers[question.id] === option.id}
                          onChange={() => handleAnswerSelect(question.id, option.id)}
                          className="mr-3 text-purple-600"
                          disabled={skippedQuestions.has(question.id)}
                        />
                        <span className="font-medium mr-2">{option.id}.</span>
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkipQuestion(question.id)}
                        disabled={skippedQuestions.has(question.id)}
                      >
                        Passer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReportQuestion(question.id)}
                        disabled={reportedQuestions.has(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Signaler un problème
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      Compétence: {question.competency}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <Button 
                    onClick={submitExam}
                    className="bg-purple-600 hover:bg-purple-700 px-8"
                    disabled={Object.keys(studentAnswers).length === 0}
                  >
                    Terminer l'examen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'results' && examResults && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Résultats de l'examen</CardTitle>
                <CardDescription>
                  Votre performance détaillée sur le QCM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-purple-600">
                    {examResults.percentage}%
                  </div>
                  <div className="text-gray-600">
                    {examResults.score}/{examResults.total} bonnes réponses
                  </div>
                  <Progress value={examResults.percentage} className="mt-2 max-w-md mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {examResults.details.filter(d => d.is_correct).length}
                    </div>
                    <div className="text-sm text-green-700">Correctes</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {examResults.details.filter(d => !d.is_correct && !d.skipped).length}
                    </div>
                    <div className="text-sm text-red-700">Incorrectes</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {examResults.details.filter(d => d.skipped).length}
                    </div>
                    <div className="text-sm text-yellow-700">Sautées</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={resetQCM} className="bg-purple-600 hover:bg-purple-700">
                    Créer un nouveau QCM
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Détails par question</TabsTrigger>
                <TabsTrigger value="reported">Questions signalées</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="space-y-4">
                  {examResults.details.map((result, index) => {
                    const question = examQuestions.find(q => q.id === result.question_id);
                    if (!question) return null;

                    return (
                      <Card key={result.question_id} className={`${
                        result.is_correct ? 'border-green-300' : 
                        result.skipped ? 'border-yellow-300' : 'border-red-300'
                      }`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              Question {index + 1}
                            </CardTitle>
                            <Badge variant={
                              result.is_correct ? 'secondary' : 
                              result.skipped ? 'outline' : 'destructive'
                            }>
                              {result.is_correct ? 'Correct' : 
                               result.skipped ? 'Sautée' : 'Incorrect'}
                            </Badge>
                          </div>
                          <CardDescription>{question.question}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <div 
                                key={option.id}
                                className={`p-2 rounded ${
                                  option.id === question.correct_answer ? 'bg-green-100 border border-green-300' :
                                  option.id === result.selected_answer ? 'bg-red-100 border border-red-300' : ''
                                }`}
                              >
                                <span className="font-medium mr-2">{option.id}.</span>
                                <span>{option.text}</span>
                                {option.id === question.correct_answer && (
                                  <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                                )}
                                {option.id === result.selected_answer && option.id !== question.correct_answer && (
                                  <span className="ml-2 text-red-600 font-medium">✗ Votre réponse</span>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Explication:</strong> {question.explanation}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="reported">
                <Card>
                  <CardHeader>
                    <CardTitle>Questions signalées</CardTitle>
                    <CardDescription>
                      Ces questions ont été signalées comme problématiques
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportedQuestions.size === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Aucune question signalée
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Array.from(reportedQuestions).map((questionId) => {
                          const question = examQuestions.find(q => q.id === questionId);
                          if (!question) return null;

                          return (
                            <div key={questionId} className="border-l-4 border-red-500 pl-4 py-2">
                              <h4 className="font-medium text-gray-900">
                                {question.question}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Compétence: {question.competency} | Difficulté: {question.difficulty}
                              </p>
                            </div>
                          );
                        })}
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