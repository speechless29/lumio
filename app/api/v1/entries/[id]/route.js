import { withAuth } from "../../../../../lib/middleware/auth.js";
import { getEntryById } from "../../../../../lib/db/queries/entries.js";

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
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      data: entry,
    });
  });
}
