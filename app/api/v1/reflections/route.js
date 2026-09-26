import { withAuth } from "../../../../lib/middleware/auth.js";
import { callAI } from "../../../../lib/ai/provider.js";
import { buildReflectionPrompt } from "../../../../lib/ai/prompts/generateReflection.js";
import {
  createWeeklyReflection,
  getEntriesForWeek,
  getWeeklyReflection,
  getWeeklyEntryCounts,
} from "../../../../lib/db/queries/reflections.js";

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day);
    sunday.setHours(0, 0, 0, 0);
    const nextSunday = new Date(sunday);
    nextSunday.setDate(sunday.getDate() + 7);
    const weekStart = sunday.toISOString().split("T")[0];
    const weekEnd = nextSunday.toISOString().split("T")[0];

    const [existingReflection, counts] = await Promise.all([
      getWeeklyReflection(user.id, weekStart),
      getWeeklyEntryCounts(user.id, weekStart, weekEnd),
    ]);

    if (existingReflection) {
      return Response.json({
        success: true,
        data: {
          reflection: existingReflection,
          has_reflection: true,
          entries_this_week: counts.total_entries,
          processed_entries_this_week: counts.processed_entries,
          entries_needed: 5,
        },
      });
    }

    const entries = await getEntriesForWeek(user.id, weekStart, weekEnd);

    if (entries.length < 5) {
      return Response.json({
        success: true,
        data: {
          reflection: null,
          has_reflection: false,
          entries_this_week: counts.total_entries,
          processed_entries_this_week: counts.processed_entries,
          entries_needed: 5,
        },
      });
    }

    let aiResponse;
    try {
      const { system, user: userPrompt } = buildReflectionPrompt(entries);
      aiResponse = await callAI(system, userPrompt);
    } catch (error) {
      console.error(
        `Weekly reflection generation failed for user ${user.id}:`,
        error,
      );
      return Response.json(
        {
          success: false,
          error: {
            code: "REFLECTION_GENERATION_FAILED",
            message:
              "Could not generate this week's reflection. Please try again.",
          },
        },
        { status: 503 },
      );
    }

    let parsed;
    try {
      const cleaned = aiResponse
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        {
          success: false,
          error: {
            code: "REFLECTION_PARSE_FAILED",
            message:
              "The reflection service returned an invalid response. Please try again.",
          },
        },
        { status: 500 },
      );
    }

    const created = await createWeeklyReflection(
      user.id,
      weekStart,
      weekEnd,
      parsed.content,
      parsed.mood_arc,
      entries.map((entry) => entry.id),
    );

    const reflection =
      created || (await getWeeklyReflection(user.id, weekStart));

    if (!reflection) {
      return Response.json(
        {
          success: false,
          error: {
            code: "REFLECTION_SAVE_FAILED",
            message: "Could not save this week's reflection. Please try again.",
          },
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      data: {
        reflection,
        has_reflection: true,
        entries_this_week: counts.total_entries,
        processed_entries_this_week: counts.processed_entries,
        entries_needed: 5,
      },
    });
  });
}
