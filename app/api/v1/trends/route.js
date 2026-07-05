import { withAuth } from "../../../../lib/middleware/auth.js";
import { getTrendDataPoints } from "../../../../lib/db/queries/trends.js";

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    const { searchParams } = new URL(request.url);
    const range = ["7d", "30d", "all"].includes(searchParams.get("range"))
      ? searchParams.get("range")
      : "30d";

    const { dataPoints, totalEntries, hasEnoughData } =
      await getTrendDataPoints(user.id, range);

    return Response.json({
      success: true,
      data: {
        data_points: dataPoints,
        total_entries: totalEntries,
        has_enough_data: hasEnoughData,
      },
    });
  });
}
