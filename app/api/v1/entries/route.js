import { withAuth } from "../../../../lib/middleware/auth.js";

import {
  createEntry,
  getEntriesByUser,
  updateEntryAIFields,
  updateEntrySafety,
} from "../../../../lib/db/queries/entries.js";

import { analyzeMood, assessSafety } from "../../../../lib/ai/aiService.js";

import { query } from "../../../../lib/db/index.js";

// --------------------------------------------------
// Safety response
// --------------------------------------------------

function getSafetyAcknowledgment(level) {
  if (level === "imminent") {
    return (
      "What you wrote suggests you may be in immediate danger. " +
      "Please contact local emergency services or a crisis support service now. " +
      "If possible, stay with someone you trust while you get support. " +
      "You can find verified local crisis resources at findahelpline.com."
    );
  }

  if (level === "concern") {
    return (
      "Some of what you wrote suggests you may be having thoughts about harming yourself or not wanting to be here. " +
      "You do not have to handle that alone. If you feel you may act on these thoughts, contact emergency or crisis support now. " +
      "Verified local resources are available at findahelpline.com."
    );
  }

  return null;
}

// --------------------------------------------------
// GET /api/v1/entries
// --------------------------------------------------

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") || 1);

    const limit = Number(searchParams.get("limit") || 10);

    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10;

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;

    const { entries, total } = await getEntriesByUser(
      user.id,
      safePage,
      safeLimit,
    );

    return Response.json({
      success: true,

      data: {
        entries,
        total,
        page: safePage,
        limit: safeLimit,
      },
    });
  });
}

// --------------------------------------------------
// Process AI
// --------------------------------------------------

async function processEntryAI(entryId, content, relationshipTags) {
  try {
    // Run both AI tasks at the same time.
    const [safetyResult, moodResult] = await Promise.all([
      assessSafety(content),

      analyzeMood(entryId, content, relationshipTags),
    ]);

    // ----------------------------------------------
    // Save safety result
    // ----------------------------------------------

    await updateEntrySafety(entryId, safetyResult.level);

    // ----------------------------------------------
    // Decide acknowledgment
    // ----------------------------------------------

    let acknowledgment = moodResult.acknowledgment;

    if (safetyResult.level === "concern" || safetyResult.level === "imminent") {
      acknowledgment = getSafetyAcknowledgment(safetyResult.level);
    }

    // ----------------------------------------------
    // Create chat thread
    // ----------------------------------------------

    const threadResult = await query(
      `INSERT INTO threads (
         user_id,
         journal_entry_id
       )
       SELECT
         user_id,
         id
       FROM journal_entries
       WHERE id = $1
       RETURNING id`,
      [entryId],
    );

    const threadId = threadResult.rows[0].id;

    // ----------------------------------------------
    // First assistant message
    // ----------------------------------------------

    await query(
      `INSERT INTO messages (
         thread_id,
         role,
         content
       )
       VALUES ($1, $2, $3)`,
      [threadId, "assistant", acknowledgment],
    );

    // ----------------------------------------------
    // Save emotion result
    // ----------------------------------------------

    await updateEntryAIFields(entryId, {
      mood_score: moodResult.mood_score,

      mood_label: moodResult.mood_label,

      secondary_emotions: moodResult.secondary_emotions ?? [],

      emotion_evidence: moodResult.emotion_evidence ?? [],

      mood_intensity: moodResult.mood_intensity,

      relationship_source: moodResult.relationship_source || null,

      stressor_type: moodResult.stressor_type || null,

      ai_acknowledgment: acknowledgment,

      thread_id: threadId,
    });

    console.log(
      `Entry ${entryId} processed: safety=${safetyResult.level}, emotion=${moodResult.mood_label}`,
    );
  } catch (error) {
    console.error(`AI processing failed for entry ${entryId}:`, error.message);
  }
}

// --------------------------------------------------
// POST /api/v1/entries
// --------------------------------------------------

export async function POST(request) {
  return withAuth(request, async (_req, user) => {
    try {
      const body = await request.json();

      const content = body?.content;

      // ------------------------------------------
      // Validation
      // ------------------------------------------

      if (typeof content !== "string" || content.trim().length < 10) {
        return Response.json(
          {
            success: false,

            error: {
              code: "CONTENT_TOO_SHORT",

              message: "Content must be at least 10 characters.",
            },
          },
          {
            status: 400,
          },
        );
      }

      if (content.length > 10000) {
        return Response.json(
          {
            success: false,

            error: {
              code: "CONTENT_TOO_LONG",

              message: "Content must be at most 10,000 characters.",
            },
          },
          {
            status: 400,
          },
        );
      }

      // ------------------------------------------
      // Save immediately
      // ------------------------------------------

      const entry = await createEntry(user.id, content);

      // AI runs after entry is saved.
      processEntryAI(entry.id, content, user.relationship_tags);

      return Response.json(
        {
          success: true,
          data: entry,
        },
        {
          status: 201,
        },
      );
    } catch (error) {
      console.error("Create entry failed:", error);

      return Response.json(
        {
          success: false,

          error: {
            code: "INTERNAL_SERVER_ERROR",

            message: error.message,
          },
        },
        {
          status: 500,
        },
      );
    }
  });
}
