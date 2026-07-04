import bcrypt from "bcryptjs";
import { signToken } from "../../../../../lib/auth.js";
import {
  createUser,
  getUserByEmail,
} from "../../../../../lib/db/queries/users.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Invalid email.",
          },
        },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Password must be at least 8 characters.",
          },
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return Response.json(
        {
          success: false,
          error: {
            code: "EMAIL_TAKEN",
            message: "Email already registered.",
          },
        },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(normalizedEmail, passwordHash);
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
      { status: 201 },
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
