import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const audioResult = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Tentando com gemini-2.0-flash
      contents: "Hello world",
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

    const audioPart = audioResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (audioPart) {
        console.log("Success! Audio length:", audioPart.inlineData.data.length);
    } else {
        console.log("No audio part found:", audioResult.candidates?.[0]?.content?.parts);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
