import { verifyToken } from "../auth.js";
import { getUserById } from "../db/queries/users.js";

export async function withAuth(request, handler) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : null;

    if (!token) {
      return Response.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid token.",
          },
        },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    const user = await getUserById(payload.userId);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid token.",
          },
        },
        { status: 401 },
      );
    }

    return handler(request, user);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid token.",
        },
      },
      { status: 401 },
    );
  }
}
