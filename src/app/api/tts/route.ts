import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { text, voiceName } = await request.json();

    if (!text || !voiceName) {
      return NextResponse.json(
        { error: "Texto e voiceName são obrigatórios" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const audioResult = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: text,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    });

    const audioPart = audioResult.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (audioPart && audioPart.inlineData) {
      return NextResponse.json({
        audioBase64: audioPart.inlineData.data,
      });
    }

    return NextResponse.json({ audioBase64: null });
  } catch (error: any) {
    console.error("Erro na rota /api/tts:", error);
    return NextResponse.json(
      { error: "Erro ao gerar TTS", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "TTS API is warmed up" });
}
