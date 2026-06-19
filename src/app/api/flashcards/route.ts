import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/flashcards?userId=ID&dueOnly=true - Retorna flashcards do usuário
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const dueOnly = searchParams.get("dueOnly") === "true";

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    const today = new Date();

    const whereClause: any = { userId };
    if (dueOnly) {
      whereClause.nextReviewDate = {
        lte: today,
      };
    }

    const flashcards = await prisma.flashcard.findMany({
      where: whereClause,
      orderBy: { nextReviewDate: "asc" },
    });

    return NextResponse.json(flashcards);
  } catch (error: any) {
    console.error("Erro na rota /api/flashcards (GET):", error);
    return NextResponse.json(
      { error: "Erro ao buscar flashcards", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/flashcards - Cria um novo flashcard de vocabulário
export async function POST(request: Request) {
  try {
    const { userId, word, translation, definition, exampleSentence } = await request.json();

    if (!userId || !word || !translation) {
      return NextResponse.json(
        { error: "userId, palavra e tradução são obrigatórios" },
        { status: 400 }
      );
    }

    // Evita duplicados da mesma palavra para o mesmo usuário
    const existing = await prisma.flashcard.findFirst({
      where: { userId, word: word.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este flashcard já existe para este usuário" },
        { status: 409 }
      );
    }

    const flashcard = await prisma.flashcard.create({
      data: {
        userId,
        word: word.trim(),
        translation: translation.trim(),
        definition: definition ? definition.trim() : "Definition not provided.",
        exampleSentence: exampleSentence ? exampleSentence.trim() : `Let's practice the word '${word}'.`,
        boxLevel: 1,
        nextReviewDate: new Date(), // Revisar imediatamente
        easinessFactor: 2.5,
        repetitions: 0,
        intervalDays: 0,
      },
    });

    // Registra evento de vocabulário adicionado no Perfil Adaptativo
    await prisma.studentEvent.create({
      data: {
        userId,
        eventType: "vocabulary_added",
        skill: "vocabulary",
        score: 100,
        details: JSON.stringify({ word: flashcard.word }),
      },
    });

    return NextResponse.json(flashcard);
  } catch (error: any) {
    console.error("Erro na rota /api/flashcards (POST):", error);
    return NextResponse.json(
      { error: "Erro ao criar flashcard", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/flashcards - Avaliação do flashcard usando o algoritmo SuperMemo-2 (SM-2)
export async function PUT(request: Request) {
  try {
    const { flashcardId, quality } = await request.json(); // quality: 0 a 5

    if (!flashcardId || quality === undefined || quality < 0 || quality > 5) {
      return NextResponse.json(
        { error: "ID do flashcard e qualidade de resposta (0-5) são obrigatórios" },
        { status: 400 }
      );
    }

    const flashcard = await prisma.flashcard.findUnique({
      where: { id: flashcardId },
    });

    if (!flashcard) {
      return NextResponse.json({ error: "Flashcard não encontrado" }, { status: 404 });
    }

    // --- ALGORITMO SM-2 ---
    let repetitions = flashcard.repetitions;
    let easinessFactor = flashcard.easinessFactor;
    let intervalDays = flashcard.intervalDays;
    let boxLevel = flashcard.boxLevel;

    if (quality < 3) {
      // Resposta incorreta: reinicia o intervalo
      repetitions = 0;
      intervalDays = 1;
      boxLevel = Math.max(1, boxLevel - 1);
    } else {
      // Resposta correta: calcula o próximo intervalo
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easinessFactor);
      }
      repetitions += 1;
      boxLevel = Math.min(5, boxLevel + 1);
    }

    // Ajusta o Easiness Factor (Fator de Facilidade) com base na qualidade
    easinessFactor =
      easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easinessFactor < 1.3) {
      easinessFactor = 1.3;
    }

    // Calcula a próxima data de revisão
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    // Salva no banco de dados SQLite
    const updatedFlashcard = await prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        repetitions,
        easinessFactor,
        intervalDays,
        boxLevel,
        nextReviewDate,
      },
    });

    // Recompensa com pontos de gamificação (10 pontos por acerto, 3 por tentativa errada)
    const pointsToAdd = quality >= 3 ? 10 : 3;
    const updatedUser = await prisma.user.update({
      where: { id: flashcard.userId },
      data: {
        points: {
          increment: pointsToAdd,
        },
      },
    });

    // Registra o evento de vocabulário revisado no Perfil Adaptativo
    await prisma.studentEvent.create({
      data: {
        userId: flashcard.userId,
        eventType: "vocabulary_reviewed",
        skill: "vocabulary",
        score: Math.round((quality / 5) * 100),
        details: JSON.stringify({
          word: flashcard.word,
          quality,
          nextReviewDate,
          intervalDays,
        }),
      },
    });

    return NextResponse.json({
      flashcard: updatedFlashcard,
      pointsGained: pointsToAdd,
      userPoints: updatedUser.points,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/flashcards (PUT):", error);
    return NextResponse.json(
      { error: "Erro ao atualizar flashcard", details: error.message },
      { status: 500 }
    );
  }
}
