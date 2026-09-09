import { withAuth } from "../../../../../lib/middleware/auth.js";
import {
  getEntryById,
  updateEntryEmotionFeedback,
} from "../../../../../lib/db/queries/entries.js";

const ALLOWED_EMOTIONS = new Set([
  "admiration",
  "amusement",
  "anger",
  "annoyance",
  "approval",
  "caring",
  "confusion",
  "curiosity",
  "desire",
  "disappointment",
  "disapproval",
  "disgust",
  "embarrassment",
  "excitement",
  "fear",
  "gratitude",
  "grief",
  "joy",
  "love",
  "nervousness",
  "optimism",
  "pride",
  "realization",
  "relief",
  "remorse",
  "sadness",
  "surprise",
  "neutral",
]);

export async function GET(request, { params }) {
  const { id } = await params;

  return withAuth(request, async (_req, user) => {
    const entry = await getEntryById(id, user.id);

    if (!entry) {
      return Response.json(
        {
          success: false,
          error: {
            code: "ENTRY_NOT_FOUND",
            message: "Journal entry not found.",
          },
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      success: true,
      data: entry,
    });
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;

  return withAuth(request, async (_req, user) => {
    try {
      const entry = await getEntryById(id, user.id);

      if (!entry) {
        return Response.json(
          {
            success: false,
            error: {
              code: "ENTRY_NOT_FOUND",
              message: "Journal entry not found.",
            },
          },
          {
            status: 404,
          },
        );
      }

      const body = await request.json();

      const emotions = body?.emotions;
      const feedback = body?.feedback;

      if (
        !Array.isArray(emotions) ||
        emotions.length < 1 ||
        emotions.length > 3
      ) {
        return Response.json(
          {
            success: false,
            error: {
              code: "INVALID_EMOTIONS",
              message: "Choose between 1 and 3 emotions.",
            },
          },
          {
            status: 400,
          },
        );
      }

      const uniqueEmotions = [...new Set(emotions)];

      if (uniqueEmotions.length < 1 || uniqueEmotions.length > 3) {
        return Response.json(
          {
            success: false,
            error: {
              code: "INVALID_EMOTIONS",
              message: "Choose between 1 and 3 unique emotions.",
            },
          },
          {
            status: 400,
          },
        );
      }

      const allValid = uniqueEmotions.every(
        (emotion) =>
          typeof emotion === "string" && ALLOWED_EMOTIONS.has(emotion),
      );

      if (!allValid) {
        return Response.json(
          {
            success: false,
            error: {
              code: "INVALID_EMOTION",
              message: "One or more emotions are invalid.",
            },
          },
          {
            status: 400,
          },
        );
      }

      if (feedback !== "confirmed" && feedback !== "edited") {
        return Response.json(
          {
            success: false,
            error: {
              code: "INVALID_FEEDBACK",
              message: "Feedback must be confirmed or edited.",
            },
          },
          {
            status: 400,
          },
        );
      }

      const updatedEntry = await updateEntryEmotionFeedback(
        id,
        user.id,
        uniqueEmotions,
        feedback,
      );

      if (!updatedEntry) {
        return Response.json(
          {
            success: false,
            error: {
              code: "UPDATE_FAILED",
              message: "Could not update emotion feedback.",
            },
          },
          {
            status: 500,
          },
        );
      }

      return Response.json({
        success: true,
        data: updatedEntry,
      });
    } catch (error) {
      console.error(`Emotion feedback update failed for entry ${id}:`, error);

      return Response.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not save emotion feedback.",
          },
        },
        {
          status: 500,
        },
      );
    }
  });
}
