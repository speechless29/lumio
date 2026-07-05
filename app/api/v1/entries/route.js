import { withAuth } from "../../../../lib/middleware/auth.js";
import {
  createEntry,
  getEntriesByUser,
} from "../../../../lib/db/queries/entries.js";

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

export async function POST(request) {
  return withAuth(request, async (_req, user) => {
    try {
      const body = await request.json();
      const content = body?.content;

      if (typeof content !== "string") {
        return Response.json(
          {
            success: false,
            error: {
              code: "CONTENT_TOO_SHORT",
              message: "Content must be at least 10 characters.",
            },
          },
          { status: 400 },
        );
      }

      if (content.trim().length < 10) {
        return Response.json(
          {
            success: false,
            error: {
              code: "CONTENT_TOO_SHORT",
              message: "Content must be at least 10 characters.",
            },
          },
          { status: 400 },
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
          { status: 400 },
        );
      }

      const entry = await createEntry(user.id, content);

      return Response.json(
        {
          success: true,
          data: entry,
        },
        { status: 201 },
      );
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          },
        },
        { status: 500 },
      );
    }
  });
}
