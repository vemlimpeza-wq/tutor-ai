import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const audioResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello world. This is a test to see if the voice works.",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede",
            },
          },
        },
      },
    });

    const parts = audioResult.candidates?.[0]?.content?.parts;
    console.log("Parts returned:", parts?.length);
    if (parts) {
        for (const p of parts) {
            console.log("Part type inlineData?", !!p.inlineData, "mimeType:", p.inlineData?.mimeType);
        }
    }
  } catch (err) {
    console.error("Error calling Gemini API:", err);
  }
}

run();
