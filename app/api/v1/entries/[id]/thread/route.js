import { withAuth } from "../../../../../../lib/middleware/auth.js";
import { query } from "../../../../../../lib/db/index.js";

export async function GET(request, { params }) {
  const { id } = await params;

  return withAuth(request, async (_req, user) => {
    const threadResult = await query(
      `SELECT * FROM threads WHERE journal_entry_id = $1 AND user_id = $2`,
      [id, user.id],
    );

    const thread = threadResult.rows[0];

    if (!thread) {
      return Response.json(
        {
          success: false,
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found.",
          },
        },
        { status: 404 },
      );
    }

    const messagesResult = await query(
      `SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [thread.id],
    );

    return Response.json({
      success: true,
      data: {
        thread,
        messages: messagesResult.rows,
      },
    });
  });
}
