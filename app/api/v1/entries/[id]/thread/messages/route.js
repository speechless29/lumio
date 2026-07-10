import { withAuth } from "../../../../../../../lib/middleware/auth.js";
import { query } from "../../../../../../../lib/db/index.js";
import { callAI } from "../../../../../../../lib/ai/provider.js";

export async function POST(request, { params }) {
  const { id } = await params;

  return withAuth(request, async (_req, user) => {
    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON body.",
          },
        },
        { status: 400 },
      );
    }

    const content = body?.content?.trim();

    if (!content) {
      return Response.json(
        {
          success: false,
          error: {
            code: "CONTENT_REQUIRED",
            message: "Content is required.",
          },
        },
        { status: 400 },
      );
    }

    const threadResult = await query(
      `SELECT * FROM threads WHERE journal_entry_id = $1 AND user_id = $2`,
      [id, user.id],
    );

    const thread = threadResult.rows[0];

    if (!thread) {
      return Response.json(
        {
          success: false,
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found.",
          },
        },
        { status: 404 },
      );
    }

    const entryResult = await query(
      `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );

    const entry = entryResult.rows[0];

    if (!entry) {
      return Response.json(
        {
          success: false,
          error: {
            code: "ENTRY_NOT_FOUND",
            message: "Journal entry not found.",
          },
        },
        { status: 404 },
      );
    }

    const messagesResult = await query(
      `SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [thread.id],
    );

    const existingMessages = messagesResult.rows;

    const userMessageResult = await query(
      `INSERT INTO messages (thread_id, role, content) VALUES ($1, 'user', $2) RETURNING *`,
      [thread.id, content],
    );

    const userMessage = userMessageResult.rows[0];

    const history = [
      ...existingMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user", content },
    ];

    const conversationPrompt = `${history
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n")}\nuser: ${content}`;

    const systemPrompt = `You are a warm, thoughtful conversation partner helping someone process what they wrote in their journal. You have access to their journal entry and the conversation so far.
Rules:
- Ask questions more than you make statements
- Never give direct advice unless explicitly asked
- Never diagnose or suggest mental health conditions
- Do not reference specific people by name — use they or this person
- Do not make causal claims about why someone behaved a certain way
- Keep responses concise — 2-4 sentences maximum per reply
- If the user seems to be in distress, acknowledge it warmly and suggest speaking with someone they trust
Journal entry (context — do not repeat this back to the user):
${entry.content}`;

    const aiReply = await callAI(systemPrompt, conversationPrompt);

    const assistantMessageResult = await query(
      `INSERT INTO messages (thread_id, role, content) VALUES ($1, 'assistant', $2) RETURNING *`,
      [thread.id, aiReply],
    );

    const assistantMessage = assistantMessageResult.rows[0];

    await query(`UPDATE threads SET last_message_at = NOW() WHERE id = $1`, [
      thread.id,
    ]);

    return Response.json(
      {
        success: true,
        data: {
          user_message: userMessage,
          assistant_message: assistantMessage,
        },
      },
      { status: 201 },
    );
  });
}
