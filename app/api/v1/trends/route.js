export async function GET() {
  return Response.json({
    success: true,
    data: { data_points: [], entry_count: 0, has_enough_data: false },
  });
}
