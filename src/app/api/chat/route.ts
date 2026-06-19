import { AIService } from "@/lib/aiService";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, conversationId, tutorId, scenario, message, accentPreference } = await request.json();

    if (!userId || !tutorId || !scenario || !message) {
      return NextResponse.json(
        { error: "Dados incompletos para envio da mensagem" },
        { status: 400 }
      );
    }

    // 1. Obtém o usuário e o nível CEFR atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // 2. Cria ou busca a conversa
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: `Dialogue in the ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} with ${tutorId.charAt(0).toUpperCase() + tutorId.slice(1)}`,
          scenario,
        },
      });
    }

    // 3. Salva a mensagem do usuário no banco de dados SQLite
    const userMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // 4. Busca o histórico de mensagens da conversa (últimas 15 mensagens para contexto)
    const historyDb = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 15,
    });

    const formattedHistory = historyDb.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // 5. Envia o histórico para obter a resposta do Tutor com correção integrada
    const tutorData = await AIService.getChatTutorResponse(
      formattedHistory,
      tutorId,
      user.cefrLevel,
      scenario,
      accentPreference
    );

    // 6. Se houver correção gramatical, atualiza a mensagem do usuário com as correções
    let updatedUserMsg = userMsg;
    if (tutorData.correction && tutorData.correction.hasErrors) {
      updatedUserMsg = await prisma.message.update({
        where: { id: userMsg.id },
        data: {
          correctedText: tutorData.correction.correctedText,
          grammarExplanation: tutorData.correction.explanation,
        },
      });

      // 7. Registra um evento de erro de gramática no Perfil Adaptativo
      await prisma.studentEvent.create({
        data: {
          userId,
          eventType: "grammar_error",
          skill: "grammar",
          score: 50, // Nota de penalização média para exercitar depois
          details: JSON.stringify({
            originalText: message,
            correctedText: tutorData.correction.correctedText,
            errors: tutorData.correction.detectedErrors,
            explanation: tutorData.correction.explanation,
          }),
        },
      });

      // Adiciona bônus de engajamento (5 pontos com erro)
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 5 } },
      });
    } else {
      // Sem erros! Ganha 15 pontos de incentivo por falar certinho
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 15 } },
      });
    }

    // 8. Salva a resposta do tutor na tabela de mensagens
    const tutorMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: tutorData.response,
        translation: tutorData.translation,
      },
    });

    // 9. Atualiza a pontuação do usuário e registra o evento de conversa fluida
    await prisma.studentEvent.create({
      data: {
        userId,
        eventType: "conversation_message",
        skill: "writing",
        score: tutorData.correction?.hasErrors ? 80 : 100,
        details: JSON.stringify({
          tutorId,
          scenario,
        }),
      },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      userMessage: updatedUserMsg,
      tutorMessage: tutorMsg,
      correction: tutorData.correction,
      userPoints: user.points + (tutorData.correction?.hasErrors ? 5 : 15),
      audioBase64: tutorData.audioBase64,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/chat:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem no chat", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/chat?conversationId=ID - Retorna o histórico de mensagens de uma conversa
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ status: "ok", message: "Chat API is warmed up" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Erro na rota /api/chat (GET):", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico do chat", details: error.message },
      { status: 500 }
    );
  }
}
