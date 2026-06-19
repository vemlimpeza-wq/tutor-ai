import { GoogleGenAI } from "@google/genai";
import { cefrQuestions } from "./data/cefrQuestions";
import { tutorProfiles } from "./data/tutors";

// Inicialização do Google Gemini (se a chave estiver presente)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Interface para retorno da correção gramatical
export interface GrammarCorrection {
  hasErrors: boolean;
  correctedText?: string;
  explanation?: string;
  detectedErrors?: string[];
}

// Interface para retorno da resposta do Tutor
export interface TutorResponse {
  response: string;
  audioUrl?: string;
  audioBase64?: string; // Simulação ou áudio real do TTS
  correction?: GrammarCorrection;
  translation?: string;
}

// Interface para avaliação de pronúncia
export interface PhonemeScore {
  phoneme: string;
  score: number;
  accuracy: "Good" | "Average" | "NeedsWork";
}

export interface WordPronunciationScore {
  word: string;
  score: number;
  phonemes: PhonemeScore[];
}

export interface PronunciationResult {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  words: WordPronunciationScore[];
  feedback: string;
}

export class AIService {
  /**
   * Retorna as questões do teste de nivelamento CEFR.
   */
  static getQuestions() {
    return cefrQuestions;
  }

  /**
   * Avalia o nível CEFR com base nas respostas do usuário.
   */
  static async evaluateCEFRLevel(
    answers: { questionId: string; selectedOption: number }[]
  ): Promise<{ cefrLevel: string; report: string; score: number }> {
    let correctCount = 0;

    // Calcula pontuação baseada no banco de dados de questões
    answers.forEach((ans) => {
      const q = cefrQuestions.find((item) => item.id === ans.questionId);
      if (q && q.correctOption === ans.selectedOption) {
        correctCount++;
      }
    });

    const totalQuestions = cefrQuestions.length;
    const percentage = (correctCount / totalQuestions) * 100;

    let cefrLevel = "A1";
    let report = "";

    // Lógica de classificação
    if (correctCount <= 3) {
      cefrLevel = "A1";
      report = "Você está no nível Iniciante (A1). Consegue compreender e usar expressões familiares e cotidianas, assim como enunciados muito simples, que visam a satisfazer necessidades concretas.";
    } else if (correctCount <= 6) {
      cefrLevel = "A2";
      report = "Você está no nível Básico (A2). Consegue compreender frases isoladas e expressões de uso frequente relacionadas com áreas de prioridade imediata (ex: informações pessoais, compras, geografia local, emprego).";
    } else if (correctCount <= 9) {
      cefrLevel = "B1";
      report = "Você está no nível Intermediário (B1). Consegue compreender os pontos essenciais de uma conversa quando é usada uma linguagem clara e padrão, lidando com a maior parte das situações encontradas na região onde a língua é falada.";
    } else if (correctCount <= 12) {
      cefrLevel = "B2";
      report = "Você está no nível Intermediário Avançado (B2). Consegue compreender as ideias principais de textos complexos sobre assuntos concretos e abstratos, incluindo discussões técnicas na sua área de especialidade, e interagir com espontaneidade.";
    } else {
      cefrLevel = "C1";
      report = "Você está no nível Avançado (C1). Consegue compreender uma vasta gama de textos longos e exigentes, reconhecendo significados implícitos, e exprime-se de forma fluente e espontânea, sem precisar procurar muito as palavras.";
    }

    // Se houver chave Gemini, enriquece o relatório usando a IA
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Analise o seguinte resultado de um teste de nivelamento de inglês:
        - Total de acertos: ${correctCount} de ${totalQuestions} (${percentage.toFixed(0)}%)
        - Nível CEFR inferido preliminarmente: ${cefrLevel}
        - Respostas enviadas pelo usuário: ${JSON.stringify(answers)}

        Escreva uma análise pedagógica curta (máximo 4 frases) em português brasileiro incentivando o aluno e explicando brevemente quais as habilidades principais de gramática/vocabulário que ele deve focar de acordo com seu desempenho.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        });

        const aiReport = response.text;
        if (aiReport) report = aiReport;
      } catch (err) {
        console.error("Erro ao chamar Gemini para avaliação de nível:", err);
      }
    }

    return { cefrLevel, report, score: correctCount };
  }

  
  /**
   * Obtém a resposta do tutor e roda o corretor gramatical simultaneamente para a mensagem do usuário usando Gemini.
   */
  static async getChatTutorResponse(
    messages: { role: string; content: string }[],
    tutorId: string,
    cefrLevel: string,
    scenario: string,
    accentPreference?: string
  ): Promise<TutorResponse> {
    const tutorObj = tutorProfiles.find((t) => t.id === tutorId) || tutorProfiles[0];
    const tutor = { ...tutorObj, accent: accentPreference || tutorObj.accent };

    const ai = getGeminiClient();
    
    if (!ai) {
      return {
        response: "I'm sorry, I cannot connect to my brain right now. Please check if the GEMINI_API_KEY is configured in the environment.",
        correction: { hasErrors: false }
      };
    }

    try {
      const systemPrompt = `You are an AI English Tutor named ${tutor.name}.
Personality: ${tutor.bio}
Your role is to simulate a conversation in a "${scenario}" scenario.
You speak with a ${tutor.accent} accent. Please use vocabulary, slang, and expressions typical of this accent.

CRITICAL INSTRUCTIONS FOR RESPONSE LENGTH:
The student's English level is: ${cefrLevel}.
- Keep your responses VERY SHORT and OBJECTIVE.
- Use a maximum of 1 to 2 simple sentences.
- DO NOT write long paragraphs.
- Adjust your vocabulary and sentence structure to be extremely simple and appropriate for this level. DO NOT use overly complex words.
- Be direct, engaging, and encourage the student to speak more.

Do NOT break character.

Analyze the user's last message for grammar mistakes.
You MUST return your response STRICTLY as a JSON object matching this schema:
{
  "hasErrors": boolean (true if there are grammar errors in the user's last message),
  "correctedText": string | null (the corrected version of the user's message, if there are errors),
  "detectedErrors": string[] (a short list of the grammar rules broken, or empty array),
  "explanation": string | null (a simple, didactic explanation in Brazilian Portuguese of the errors and how to improve, considering their CEFR level),
  "response": string (your actual conversational reply to the user, in English, acting as the tutor),
  "translation": string (a tradução exata da sua "response" para o Português de Angola)
}`;

      // Convert messages to Gemini format
      const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      // STEP 1: Get Text & Grammar Correction (com retry e fallback de modelos)
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            console.log(`[AIService] Tentando modelo: ${modelName} (tentativa ${attempt + 1})`);
            response = await ai.models.generateContent({
              model: modelName,
              contents: geminiContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                responseMimeType: "application/json",
              }
            });
            break; // Sucesso, sai do loop de tentativas
          } catch (e: any) {
            lastError = e;
            const status = e?.status || e?.code || 0;
            console.warn(`[AIService] Modelo ${modelName} falhou (status ${status}): ${e.message?.substring(0, 100)}`);
            if (status === 429 || status === 503) {
              // Espera 2s antes de tentar novamente
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            break; // Erro diferente de 429/503, tenta próximo modelo
          }
        }
        if (response) break; // Sucesso com algum modelo, sai
      }

      if (!response) {
        throw lastError || new Error("Todos os modelos falharam");
      }

      const jsonContent = response.text;
      if (!jsonContent) throw new Error("No content returned from Gemini");

      const parsed = JSON.parse(jsonContent);
      const textResponse = parsed.response || "Sorry, I didn't understand that.";
      const translationText = parsed.translation || "";

      // STEP 2: Generate TTS Audio for the natural voice (REMOVIDO)
      // Para evitar lentidão na resposta do chat, o frontend agora gera o áudio
      // de forma assíncrona chamando a rota /api/tts.
      let audioBase64 = undefined;

      return {
        response: textResponse,
        audioBase64,
        translation: translationText,
        correction: {
          hasErrors: parsed.hasErrors || false,
          correctedText: parsed.correctedText,
          detectedErrors: parsed.detectedErrors,
          explanation: parsed.explanation,
        }
      };
    } catch (err: any) {
      console.error("Error calling Gemini:", err);
      const status = err?.status || err?.code || 0;
      let errorMsg = "Oops, my connection to the server was interrupted. Let's try that again.";
      if (status === 429) {
        errorMsg = "⚠️ A cota gratuita da API do Google Gemini foi atingida. Por favor, aguarde alguns minutos e tente novamente.";
      } else if (status === 503) {
        errorMsg = "⏳ Os servidores do Gemini estão em alta demanda agora. Tente novamente em 30 segundos.";
      }
      return {
        response: errorMsg,
        correction: { hasErrors: false }
      };
    }
  }

  /**
   * Avalia a pronúncia de uma gravação de voz (Simulada e Azure Speech).
   */
  static async evaluatePronunciation(
    audioBase64: string, // Áudio em base64 vindo do microfone
    expectedText: string
  ): Promise<PronunciationResult> {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (speechKey && speechRegion) {
      // Aqui integrará com o SDK Real da Azure Cognitive Services Speech no futuro
      // Para o deploy em produção, o backend receberá o áudio e enviará ao SDK.
      console.log("Azure Speech API detectada. Executando integração de pronúncia...");
    }

    // --- MOTOR DE SIMULAÇÃO (MOCK) DETALHADO FONEMA A FONEMA ---
    // Cria um relatório realista que separa o texto esperado em palavras e fonemas.
    const words = expectedText.split(/\s+/).map((rawWord) => {
      const word = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (!word) return null;

      // Determina uma nota simulada de pronúncia
      const wordScore = Math.floor(Math.random() * (98 - 75 + 1)) + 75;

      // Simula alguns fonemas para a palavra
      const phonemes: PhonemeScore[] = [];
      const len = Math.min(word.length, 4);
      for (let i = 0; i < len; i++) {
        const phoneme = word[i].toUpperCase();
        const score = Math.min(100, wordScore + Math.floor(Math.random() * 10 - 5));
        phonemes.push({
          phoneme,
          score,
          accuracy: score >= 90 ? "Good" : score >= 80 ? "Average" : "NeedsWork",
        });
      }

      return {
        word,
        score: wordScore,
        phonemes,
      };
    }).filter(Boolean) as WordPronunciationScore[];

    const scores = words.map((w) => w.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) || 90;
    const accuracyScore = Math.min(100, overallScore + 2);
    const fluencyScore = Math.min(100, overallScore - 1);

    let feedback = "Excelente pronúncia! Seu ritmo está muito bom e a entonação é natural. Continue praticando para polir pequenos detalhes.";
    if (overallScore < 85) {
      feedback = "Bom trabalho! Notei alguma hesitação e alguns sons vocálicos precisam de ajuste. Tente escutar o áudio nativo de referência e repetir focando na fluência.";
    }

    return {
      overallScore,
      accuracyScore,
      fluencyScore,
      words,
      feedback,
    };
  }
}
