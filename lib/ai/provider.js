import { GoogleGenAI } from "@google/genai";

let client;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const message = String(error?.message || error);

  return (
    message.includes('"code":503') ||
    message.includes('"code":500') ||
    message.includes('"code":429') ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

async function generateWithRetry({ model, contents, config, attempts = 3 }) {
  const ai = getClient();

  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === attempts - 1) {
        throw error;
      }

      const baseDelay = 1000 * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 400);

      await sleep(baseDelay + jitter);
    }
  }

  throw lastError;
}

async function generateWithFallback({ contents, config }) {
  try {
    return await generateWithRetry({
      model: PRIMARY_MODEL,
      contents,
      config,
      attempts: 3,
    });
  } catch (primaryError) {
    if (!isRetryableError(primaryError)) {
      throw primaryError;
    }

    console.warn(
      `Primary Gemini model failed (${PRIMARY_MODEL}). Falling back to ${FALLBACK_MODEL}.`,
    );

    return generateWithRetry({
      model: FALLBACK_MODEL,
      contents,
      config,
      attempts: 2,
    });
  }
}

export async function callAI(systemPrompt, userPrompt, options = {}) {
  const { maxOutputTokens = 500, thinkingLevel = "low" } = options;

  try {
    const response = await generateWithFallback({
      contents: userPrompt,

      config: {
        systemInstruction: systemPrompt,

        maxOutputTokens,

        thinkingConfig: {
          thinkingLevel,
        },
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error("AI response contained no text");
    }

    return text;
  } catch (error) {
    throw new Error(`AI provider error: ${error.message}`);
  }
}

export async function callStructuredAI(
  systemPrompt,
  userPrompt,
  schema,
  options = {},
) {
  const { maxOutputTokens = 700, thinkingLevel = "low" } = options;

  try {
    const response = await generateWithFallback({
      contents: userPrompt,

      config: {
        systemInstruction: systemPrompt,

        maxOutputTokens,

        thinkingConfig: {
          thinkingLevel,
        },

        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error("AI response contained no text");
    }

    return JSON.parse(text);
  } catch (error) {
    throw new Error(`AI provider error: ${error.message}`);
  }
}
