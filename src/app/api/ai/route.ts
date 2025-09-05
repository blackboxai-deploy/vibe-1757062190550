import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_ENDPOINT = 'https://oi-server.onrender.com/chat/completions';
const CUSTOMER_ID = 'cus_SGPn4uhjPI0F4w';
const AUTHORIZATION = 'Bearer xxx';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequestBody {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  tool?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AIRequestBody = await request.json();
    
    const { model, messages, temperature = 0.5, max_tokens = 4000, tool } = body;

    // Validate required fields
    if (!model || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    // Set system prompt based on tool
    const systemPrompts = {
      'code-evaluation': `Tu es un expert en évaluation de code. Génère exactement 10 questions pertinentes sur le code fourni. 
      Les questions doivent tester la compréhension, la logique, les bonnes pratiques et les concepts utilisés.
      Retourne UNIQUEMENT un objet JSON valide avec cette structure:
      {
        "questions": [
          {
            "id": 1,
            "question": "Question claire et précise",
            "type": "open",
            "difficulty": "facile|moyen|difficile",
            "points": 10
          }
        ],
        "total_points": 100
      }`,
      
      'code-evaluation-grade': `Tu es un expert en évaluation de code. Évalue les réponses fournies aux questions sur le code.
      Pour chaque réponse, donne une note de 0 à 10 points et un commentaire constructif.
      Retourne UNIQUEMENT un objet JSON valide avec cette structure:
      {
        "evaluations": [
          {
            "question_id": 1,
            "score": 8,
            "max_score": 10,
            "feedback": "Commentaire détaillé sur la réponse"
          }
        ],
        "total_score": 85,
        "total_possible": 100,
        "percentage": 85,
        "general_feedback": "Commentaire général sur l'évaluation"
      }`,
      
      'code-analysis': `Tu es un expert en analyse de code. Analyse le code fourni et les spécifications.
      Identifie les améliorations possibles, les problèmes potentiels et génère des questions d'aide.
      Retourne UNIQUEMENT un objet JSON valide avec cette structure:
      {
        "analysis": {
          "strengths": ["Points forts du code"],
          "weaknesses": ["Points à améliorer"],
          "suggestions": ["Recommandations concrètes"]
        },
        "compliance": {
          "score": 85,
          "details": "Analyse de conformité aux spécifications"
        },
        "help_questions": [
          {
            "question": "Question d'aide pour comprendre le code",
            "context": "Contexte de la question"
          }
        ]
      }`,
      
      'qcm-generator': `Tu es un expert en création de QCM. Génère des questions à choix multiples basées sur le sujet fourni.
      Chaque question doit tester les compétences et connaissances essentielles du sujet.
      Retourne UNIQUEMENT un objet JSON valide avec cette structure:
      {
        "questions": [
          {
            "id": 1,
            "question": "Question claire",
            "options": [
              {"id": "A", "text": "Option A"},
              {"id": "B", "text": "Option B"},
              {"id": "C", "text": "Option C"},
              {"id": "D", "text": "Option D"}
            ],
            "correct_answer": "A",
            "explanation": "Explication de la bonne réponse",
            "difficulty": "facile|moyen|difficile",
            "competency": "Compétence testée"
          }
        ],
        "metadata": {
          "subject": "Sujet du QCM",
          "total_questions": 20,
          "estimated_time": "30 minutes"
        }
      }`
    };

    // Add system prompt if tool specified
    const finalMessages = [...messages];
    if (tool && systemPrompts[tool as keyof typeof systemPrompts]) {
      finalMessages.unshift({
        role: 'system',
        content: systemPrompts[tool as keyof typeof systemPrompts]
      });
    }

    // Make request to OpenRouter
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'customerId': CUSTOMER_ID,
        'Authorization': AUTHORIZATION,
      },
      body: JSON.stringify({
        model: model || 'openrouter/anthropic/claude-sonnet-4',
        messages: finalMessages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json(
        { error: 'AI service error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract content from response
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON if it's a structured response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      // If not JSON, return as text
      parsedResponse = { content: aiResponse };
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      raw_response: aiResponse,
      usage: data.usage || {}
    });

  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}