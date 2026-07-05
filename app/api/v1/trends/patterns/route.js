import { withAuth } from "../../../../../lib/middleware/auth.js";
import { getActivePatterns } from "../../../../../lib/db/queries/trends.js";

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    const patterns = await getActivePatterns(user.id);

    return Response.json({
      success: true,
      data: {
        patterns,
      },
    });
  });
}
