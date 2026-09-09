import { GoogleGenAI } from "@google/genai";

let client;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey,
    });
  }

  return client;
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";

// --------------------------------------------------
// Utilities
// --------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const message = String(error?.message || error);

  return (
    message.includes('"code":429') ||
    message.includes('"code":500') ||
    message.includes('"code":502') ||
    message.includes('"code":503') ||
    message.includes('"code":504') ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

/*
 * Gemini 3.x supports thinkingLevel.
 *
 * Gemini 2.5 GenerateContent uses the older
 * thinking configuration, so when we fall back
 * to 2.5 we simply let the model use its default
 * thinking behavior.
 */
function prepareConfigForModel(model, config) {
  if (model.startsWith("gemini-2.5")) {
    const { thinkingConfig, ...rest } = config;

    return rest;
  }

  return config;
}

// --------------------------------------------------
// Generate with retry
// --------------------------------------------------

async function generateWithRetry({ model, contents, config, attempts = 2 }) {
  const ai = getClient();

  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,

        contents,

        config: prepareConfigForModel(model, config),
      });
    } catch (error) {
      lastError = error;

      const isLast = attempt === attempts - 1;

      if (!isRetryableError(error) || isLast) {
        throw error;
      }

      const delay = 800 * 2 ** attempt + Math.floor(Math.random() * 300);

      await sleep(delay);
    }
  }

  throw lastError;
}

// --------------------------------------------------
// Primary → fallback
// --------------------------------------------------

async function generateWithFallback({ contents, config }) {
  try {
    return await generateWithRetry({
      model: PRIMARY_MODEL,
      contents,
      config,
      attempts: 2,
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

// --------------------------------------------------
// Normal text generation
// --------------------------------------------------

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

// --------------------------------------------------
// Structured JSON generation
// --------------------------------------------------

function extractJSON(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue below.
  }

  const objectStart = cleaned.indexOf("{");

  const objectEnd = cleaned.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    const possibleJSON = cleaned.slice(objectStart, objectEnd + 1);

    try {
      return JSON.parse(possibleJSON);
    } catch {
      // Continue below.
    }
  }

  const arrayStart = cleaned.indexOf("[");

  const arrayEnd = cleaned.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    const possibleJSON = cleaned.slice(arrayStart, arrayEnd + 1);

    try {
      return JSON.parse(possibleJSON);
    } catch {
      // Continue below.
    }
  }

  throw new Error(
    `Model did not return valid JSON. Response: ${cleaned.slice(0, 300)}`,
  );
}

export async function callStructuredAI(
  systemPrompt,
  userPrompt,
  schema,
  options = {},
) {
  const { maxOutputTokens = 700, thinkingLevel = "low" } = options;

  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
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

          temperature: 0.1,
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new Error("AI response contained no text");
      }

      return extractJSON(text);
    } catch (error) {
      lastError = error;

      console.warn(
        `Structured AI attempt ${attempt + 1} failed:`,
        error.message,
      );

      if (attempt === 0) {
        await sleep(400);
      }
    }
  }

  throw new Error(`AI provider error: ${lastError.message}`);
}

// --------------------------------------------------
// Real multi-turn chat
// --------------------------------------------------

export async function callChatAI(systemPrompt, messages, options = {}) {
  const { maxOutputTokens = 400, thinkingLevel = "minimal" } = options;

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",

    parts: [
      {
        text: message.content,
      },
    ],
  }));

  try {
    const response = await generateWithFallback({
      contents,

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
