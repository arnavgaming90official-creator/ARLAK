import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function testSendText() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const session = await ai.live.connect({
    model: "gemini-2.0-flash-exp",
    config: {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
    },
    callbacks: {
      onmessage: (msg) => {
        if (msg.serverContent?.modelTurn?.parts) {
          console.log("Model response parts:", JSON.stringify(msg.serverContent.modelTurn.parts, null, 2));
        } else if (msg.type === "turnComplete") {
          console.log("Turn complete.");
        } else if (msg.serverContent) {
          console.log("Received serverContent:", JSON.stringify(msg, null, 2));
        }
      }
    }
  });

  console.log("Connected. Sending text...");
  try {
    session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: "Hello, can you hear me? Respond with the word TESTING." }] }],
      turnComplete: true
    });
    console.log("Sent text successfully. Waiting for response...");
  } catch (err) {
    console.error("Failed to send text:", err);
  }

  setTimeout(() => {
    session.close();
    process.exit(0);
  }, 15000);
}

testSendText();
