import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/users - Cria um novo usuário de teste ou retorna o existente por e-mail
export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios" },
        { status: 400 }
      );
    }

    // Busca ou cria o usuário pelo email
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          cefrLevel: "A1",
          streakDays: 1,
          points: 100, // Pontos iniciais
          lastActiveDate: new Date(),
        },
      });
    } else {
      // Atualiza a última data ativa e opcionalmente streaks
      const today = new Date();
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      let newStreak = user.streakDays;

      if (lastActive) {
        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Dia consecutivo
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak quebrado, reinicia
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          streakDays: newStreak,
          lastActiveDate: today,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Erro na rota /api/users (POST):", error);
    return NextResponse.json(
      { error: "Erro interno no servidor", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/users?id=USER_ID - Busca dados de um usuário existente
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Erro na rota /api/users (GET):", error);
    return NextResponse.json(
      { error: "Erro interno no servidor", details: error.message },
      { status: 500 }
    );
  }
}
