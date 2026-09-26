import { withAuth } from "../../../../../lib/middleware/auth.js";
import { getDailyMoodAverages } from "../../../../../lib/db/queries/trendsCalendar.js";
import { moodToColor } from "../../../../../lib/trends/moodColor.js";

// --------------------------------------------------
// GET /api/v1/trends/calendar?month=YYYY-MM
// --------------------------------------------------

export async function GET(request) {
  return withAuth(request, async (_req, user) => {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");

    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_MONTH",
            message: "month query param is required, format YYYY-MM.",
          },
        },
        { status: 400 },
      );
    }

    const [year, month] = monthParam.split("-").map(Number);

    const rows = await getDailyMoodAverages(user.id, year, month);

    const days = rows.map((row) => ({
      date: row.day,
      avgMood: Number(row.avg_mood.toFixed(2)),
      entryCount: row.entry_count,
      color: moodToColor(row.avg_mood),
    }));

    return Response.json({
      success: true,
      data: { month: monthParam, days },
    });
  });
}
