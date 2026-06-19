import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/dashboard?userId=ID - Retorna estatísticas de aprendizado consolidadas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    // 1. Busca os dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // 2. Busca total de flashcards e flashcards pendentes de revisão hoje
    const totalFlashcards = await prisma.flashcard.count({
      where: { userId },
    });

    const pendingFlashcards = await prisma.flashcard.count({
      where: {
        userId,
        nextReviewDate: {
          lte: new Date(),
        },
      },
    });

    // 3. Busca histórico recente de eventos para gerar os gráficos
    const recentEvents = await prisma.studentEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 4. Calcula a média de notas por habilidade (Speaking, Writing, Grammar, Vocabulary)
    const skillsAnalysis = await prisma.studentEvent.groupBy({
      by: ["skill"],
      where: {
        userId,
        eventType: {
          in: ["pronunciation_score", "grammar_error", "vocabulary_reviewed", "level_test_completed"],
        },
      },
      _avg: {
        score: true,
      },
      _count: {
        id: true,
      },
    });

    // Formata a análise de habilidades
    const skillsData = {
      speaking: 0,
      writing: 0,
      grammar: 0,
      vocabulary: 0,
    };

    skillsAnalysis.forEach((item) => {
      const skillName = item.skill as keyof typeof skillsData;
      if (skillsData[skillName] !== undefined) {
        skillsData[skillName] = Math.round(item._avg.score || 0);
      }
    });

    // 5. Analisa erros gramaticais comuns no perfil adaptativo do aluno
    const grammarErrorEvents = await prisma.studentEvent.findMany({
      where: {
        userId,
        eventType: "grammar_error",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const commonErrorsList: string[] = [];
    grammarErrorEvents.forEach((evt) => {
      try {
        const details = JSON.parse(evt.details);
        if (details.errors && Array.isArray(details.errors)) {
          commonErrorsList.push(...details.errors);
        }
      } catch (e) {
        // Ignora erros de parse
      }
    });

    // Conta a recorrência dos erros gramaticais
    const errorFrequency: Record<string, number> = {};
    commonErrorsList.forEach((err) => {
      errorFrequency[err] = (errorFrequency[err] || 0) + 1;
    });

    const topErrors = Object.entries(errorFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 erros recorrentes

    // 6. Evolução semanal de pontuação (Simulação de histórico de atividades terminadas por dia)
    const activeDays = recentEvents.reduce((acc: Record<string, number>, evt) => {
      const dateStr = evt.createdAt.toISOString().split("T")[0];
      acc[dateStr] = (acc[dateStr] || 0) + 10; // 10 xp aproximado por evento
      return acc;
    }, {});

    const weeklyActivity = Object.entries(activeDays)
      .map(([date, xp]) => ({ date, xp }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Últimos 7 dias ativos

    // 7. Retorna tudo estruturado
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        cefrLevel: user.cefrLevel,
        points: user.points,
        streakDays: user.streakDays,
      },
      flashcards: {
        total: totalFlashcards,
        pending: pendingFlashcards,
      },
      skills: skillsData,
      topErrors,
      weeklyActivity,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao gerar estatísticas do painel", details: error.message },
      { status: 500 }
    );
  }
}
