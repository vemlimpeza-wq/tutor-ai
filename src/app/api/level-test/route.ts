import { AIService } from "@/lib/aiService";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/level-test - Processa as respostas do teste de nivelamento e atualiza o nível do usuário
export async function POST(request: Request) {
  try {
    const { userId, answers } = await request.json(); // answers: { questionId: string, selectedOption: number }[]

    if (!userId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Dados incompletos para a avaliação" },
        { status: 400 }
      );
    }

    // 1. Roda o motor de avaliação de nível
    const evaluation = await AIService.evaluateCEFRLevel(answers);

    // 2. Atualiza o usuário no banco com o novo nível CEFR e dá bônus de pontos pela conclusão
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        cefrLevel: evaluation.cefrLevel,
        points: {
          increment: 150, // Bônus de 150 pontos por terminar o nivelamento
        },
      },
    });

    // 3. Registra o evento de nivelamento finalizado no Perfil Adaptativo
    await prisma.studentEvent.create({
      data: {
        userId,
        eventType: "level_test_completed",
        skill: "grammar",
        score: Math.round((evaluation.score / AIService.getQuestions().length) * 100),
        details: JSON.stringify({
          cefrLevel: evaluation.cefrLevel,
          correctAnswers: evaluation.score,
          totalQuestions: AIService.getQuestions().length,
          report: evaluation.report,
        }),
      },
    });

    return NextResponse.json({
      cefrLevel: evaluation.cefrLevel,
      report: evaluation.report,
      score: evaluation.score,
      totalQuestions: AIService.getQuestions().length,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/level-test:", error);
    return NextResponse.json(
      { error: "Erro ao processar avaliação de nível", details: error.message },
      { status: 500 }
    );
  }
}
