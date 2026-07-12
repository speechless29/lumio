export function buildReflectionPrompt(entries) {
  const formattedEntries = (entries || [])
    .map(
      (entry) =>
        `[${new Date(entry.created_at).toLocaleDateString("en", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}] Mood: ${entry.mood_score}/10 (${entry.mood_label})\nEntry: ${entry.content.slice(0, 300)}`,
    )
    .join("\n\n");

  return {
    system: `You are writing a brief, warm weekly emotional summary for a person based on their private journal entries from the past week.

Rules:
- Write in second person (you, your)
- 3-5 sentences only
- Observational tone — describe what you noticed, not what they should do
- Do not name specific people mentioned in entries
- Do not give advice or suggest actions
- Do not use clinical language
- Be warm and human — like a thoughtful friend reflecting back what they shared
- Write in the same language as the journal entries
- Identify the week's emotional high point and low point for mood_arc

Return ONLY a JSON object with no preamble, no markdown:
{
  content: string (the 3-5 sentence reflection paragraph),
  mood_arc: {
    high: { day: string, score: number },
    low: { day: string, score: number }
  }
}`,
    user: `Format the entries as a readable summary:\n\n${formattedEntries}`,
  };
}
