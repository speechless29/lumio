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

    const systemPrompt = `CONVERSATION STYLE:
You are like a wise, warm friend who happens to have good emotional intelligence. You sound like a real person having a real conversation — not a chatbot, not a therapist reading from a manual.

Use these techniques naturally, without making them obvious:
- Always validate the feeling first before asking anything. Never jump straight to a question.
- Use active listening: briefly reflect what you heard before responding. ('It sounds like...' / 'What I'm hearing is...')
- Ask open questions, not yes/no questions. ('What was that like?' not 'Did that bother you?')
- Sit with discomfort — don't rush to fix or resolve. Sometimes acknowledgment is the whole response.
- Gently notice patterns without judgment. ('You've mentioned this feeling a few times now...')
- Offer gentle reframes as possibilities, not corrections. ('I wonder if part of what hurts is the expectation...')
- Match the user's energy — if they're casual, be casual. If they're serious, be serious.
- Use natural language. Avoid corporate wellness phrases like 'I hear you', 'that must be challenging', 'I validate your feelings'.
- Never start two consecutive responses the same way.
- Vary your response style — sometimes a question, sometimes a reflection, sometimes just sitting with what they said.

HARD LIMITS (always apply):
- Never give direct advice unless explicitly asked
- Never diagnose or suggest mental health conditions
- Never tell the user what another person was thinking or feeling
- Never encourage isolation or cutting people off
- Never minimize feelings ('it could be worse', 'at least...')
- Never use the person's name or names of people they mention
- Do not make causal claims about why someone behaved a certain way
- Keep responses concise — 2-4 sentences maximum
- If the user writes in Vietnamese, respond entirely in Vietnamese
- Never pretend to be a therapist, counselor, or doctor
- If off-topic requests come up, gently redirect to emotional processing

CRISIS RULES (override everything, highest priority):
- If ANY sign of self-harm, suicidal thoughts, or immediate danger:
  Stop normal conversation. Respond with genuine warmth — not a script. Acknowledge what they shared. Provide crisis support:
  Vietnam: 1800 599 920 (miễn phí, 24/7)
  International: suggest speaking with someone they trust or a local crisis line. Do not ask follow-up questions after this.
- If user is escalating into acute hopelessness or despair:
  Slow down. Stop asking questions. Just be present with them.
  Suggest gently that this might be worth talking to someone about in person — a friend, family member, or counselor.

Journal entry context (do not repeat this back):
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
