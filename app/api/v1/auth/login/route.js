import bcrypt from "bcryptjs";
import { signToken } from "../../../../../lib/auth.js";
import { getUserByEmail } from "../../../../../lib/db/queries/users.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
          },
        },
        { status: 401 },
      );
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
          },
        },
        { status: 401 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
          },
        },
        { status: 401 },
      );
    }

    const token = await signToken({ userId: user.id });

    return Response.json(
      {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            relationship_tags: user.relationship_tags,
            created_at: user.created_at,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        },
      },
      { status: 500 },
    );
  }
}
