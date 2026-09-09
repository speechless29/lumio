import { callStructuredAI } from "./provider.js";
import {
  analyzeMoodSchema,
  buildAnalyzeMoodPrompt,
} from "./prompts/analyzeMood.js";
import { safetySchema, buildSafetyPrompt } from "./prompts/assessSafety.js";
export async function assessSafety(content) {
  const { system, user } = buildSafetyPrompt(content);

  const result = await callStructuredAI(system, user, safetySchema, {
    thinkingLevel: "low",
    maxOutputTokens: 120,
  });

  if (!["none", "concern", "imminent"].includes(result.level)) {
    throw new Error("Invalid safety classification");
  }

  return {
    level: result.level,
    evidence: result.evidence ?? null,
  };
}

export async function analyzeMood(entryId, content, relationshipTags) {
  const { system, user } = buildAnalyzeMoodPrompt(content, relationshipTags);

  const result = await callStructuredAI(system, user, analyzeMoodSchema, {
    temperature: 0.1,
    thinkingLevel: "low",
  });

  if (
    !Number.isInteger(result.mood_score) ||
    result.mood_score < 1 ||
    result.mood_score > 10
  ) {
    throw new Error(`Invalid mood_score for entry ${entryId}`);
  }

  if (!["low", "moderate", "high"].includes(result.mood_intensity)) {
    throw new Error(`Invalid mood_intensity for entry ${entryId}`);
  }

  if (!result.primary_emotion || typeof result.primary_emotion !== "string") {
    throw new Error(`Missing primary emotion for entry ${entryId}`);
  }

  const relationshipSource =
    result.relationship_source === "none" ? null : result.relationship_source;

  const stressorType =
    result.stressor_type === "none" ? null : result.stressor_type;

  return {
    // Existing fields used by your database/UI
    mood_score: result.mood_score,
    mood_label: result.primary_emotion,
    mood_intensity: result.mood_intensity,
    relationship_source: relationshipSource,
    stressor_type: stressorType,
    acknowledgment: result.acknowledgment,

    // Keep these available internally.
    // We will store them in the database in a later step.
    secondary_emotions: result.secondary_emotions ?? [],
    emotion_evidence: result.evidence ?? [],
  };
}
