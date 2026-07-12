import { withAuth } from "../../../../lib/middleware/auth.js";
import { callAI } from "../../../../lib/ai/provider.js";
import { buildReflectionPrompt } from "../../../../lib/ai/prompts/generateReflection.js";
import {
  createWeeklyReflection,
  getEntriesForWeek,
  getWeeklyReflection,
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

    const existingReflection = await getWeeklyReflection(user.id, weekStart);

    if (existingReflection) {
      return Response.json({
        success: true,
        data: {
          reflection: existingReflection,
          has_reflection: true,
          entries_this_week: existingReflection.entry_ids?.length ?? 0,
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
          entries_this_week: entries.length,
          entries_needed: 5,
        },
      });
    }

    const { system, user: userPrompt } = buildReflectionPrompt(entries);
    const aiResponse = await callAI(system, userPrompt);

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
            message: "Failed to parse reflection response.",
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

    return Response.json({
      success: true,
      data: {
        reflection: created,
        has_reflection: true,
        entries_this_week: entries.length,
        entries_needed: 5,
      },
    });
  });
}
