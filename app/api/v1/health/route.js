import { query } from "../../../../lib/db/index.js";

export async function GET() {
  try {
    const result = await query("SELECT NOW() as time");

    return Response.json({
      success: true,
      time: result.rows[0].time,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
