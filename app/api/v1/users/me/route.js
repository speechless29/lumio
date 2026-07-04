import { withAuth } from "../../../../../lib/middleware/auth.js";

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    return Response.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        relationship_tags: user.relationship_tags,
        created_at: user.created_at,
        last_active_at: user.last_active_at,
      },
    });
  });
}
