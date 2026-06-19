import { AIService } from "@/lib/aiService";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/pronunciation - Processa a avaliação de áudio e atualiza a pontuação
export async function POST(request: Request) {
  try {
    const { userId, audio, expectedText } = await request.json();

    if (!userId || !expectedText) {
      return NextResponse.json(
        { error: "Dados incompletos para avaliação de pronúncia" },
        { status: 400 }
      );
    }

    // 1. Roda a análise de pronúncia (Mock ou Real)
    // Se o audio vier vazio (por exemplo, em simulações puras de UI), o motor funciona com o base64 simulado.
    const result = await AIService.evaluatePronunciation(audio || "", expectedText);

    // 2. Calcula pontos ganhos com base na nota geral (ex: 20 pontos base + bônus pela nota)
    const pointsGained = 20 + Math.round(result.overallScore / 10);

    // 3. Atualiza os pontos do usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: pointsGained,
        },
      },
    });

    // 4. Registra o evento de fala no Perfil Adaptativo
    await prisma.studentEvent.create({
      data: {
        userId,
        eventType: "pronunciation_score",
        skill: "speaking",
        score: result.overallScore,
        details: JSON.stringify({
          expectedText,
          accuracyScore: result.accuracyScore,
          fluencyScore: result.fluencyScore,
          wordDetails: result.words,
          feedback: result.feedback,
        }),
      },
    });

    return NextResponse.json({
      evaluation: result,
      pointsGained,
      userPoints: updatedUser.points,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/pronunciation:", error);
    return NextResponse.json(
      { error: "Erro ao avaliar pronúncia", details: error.message },
      { status: 500 }
    );
  }
}
