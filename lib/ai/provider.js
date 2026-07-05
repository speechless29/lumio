import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callAI(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    if (!text) throw new Error("AI response contained no text");
    return text;
  } catch (error) {
    throw new Error(`AI provider error: ${error.message}`);
  }
}
