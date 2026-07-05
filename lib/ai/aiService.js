import { callAI } from "./provider.js";
import { buildAnalyzeMoodPrompt } from "./prompts/analyzeMood.js";

function stripCodeFences(text) {
  return text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
}

export async function analyzeMood(entryId, content, relationshipTags) {
  const { system, user } = buildAnalyzeMoodPrompt(content, relationshipTags);
  const responseText = await callAI(system, user);
  const cleanedText = stripCodeFences(responseText);

  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (error) {
    throw new Error(
      `Failed to parse AI response for entry ${entryId}: ${error.message}. Response: ${responseText}`,
    );
  }

  const requiredFields = [
    "mood_score",
    "mood_label",
    "mood_intensity",
    "acknowledgment",
  ];

  for (const field of requiredFields) {
    if (
      parsed[field] === undefined ||
      parsed[field] === null ||
      (typeof parsed[field] === "string" && parsed[field].trim() === "")
    ) {
      throw new Error(
        `AI response missing required field "${field}" for entry ${entryId}: ${responseText}`,
      );
    }
  }

  return parsed;
}
