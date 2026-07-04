export async function GET() {
  return Response.json({
    success: true,
    data: { entries: [], total: 0, page: 1, limit: 10 },
  });
}

export async function POST() {
  return Response.json({ success: true, data: null });
}
