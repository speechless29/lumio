import {
  getPatternSourceEntries,
  getProcessedEntryCount,
  replaceActivePatterns,
} from "../db/queries/trends.js";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function cleanCategory(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().toLowerCase();

  return cleaned || null;
}

function getEntryEmotions(entry) {
  /*
   * Prefer emotions the user confirmed or edited.
   *
   * If they have not verified them, fall back
   * to Lumio's primary emotion.
   */

  if (Array.isArray(entry.user_emotions) && entry.user_emotions.length > 0) {
    return entry.user_emotions;
  }

  if (entry.mood_label) {
    return [entry.mood_label];
  }

  return [];
}

function getMostCommonEmotion(entries) {
  const counts = new Map();

  for (const entry of entries) {
    const emotions = getEntryEmotions(entry);

    for (const emotion of emotions) {
      if (!emotion) {
        continue;
      }

      const label = String(emotion).trim().toLowerCase();

      if (!label) {
        continue;
      }

      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  let winner = null;
  let highest = 0;

  for (const [emotion, count] of counts.entries()) {
    if (count > highest) {
      winner = emotion;
      highest = count;
    }
  }

  return winner;
}

function averageMood(entries) {
  const scores = entries
    .map((entry) => Number(entry.mood_score))
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) {
    return null;
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return Number(average.toFixed(2));
}

function buildDescription(patternType, category, entries) {
  const count = entries.length;

  const emotion = getMostCommonEmotion(entries);

  if (patternType === "relationship") {
    if (emotion) {
      return (
        `Across ${count} entries involving ${category}, ` +
        `${emotion} appeared most often.`
      );
    }

    return `You've mentioned ${category} ` + `across ${count} entries.`;
  }

  if (emotion) {
    return (
      `Across ${count} entries about ${category}, ` +
      `${emotion} appeared most often.`
    );
  }

  return `You've written about ${category} ` + `across ${count} entries.`;
}

// --------------------------------------------------
// Build one pattern
// --------------------------------------------------

function buildPattern(patternType, category, entries) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  return {
    pattern_type: patternType,

    category,

    description: buildDescription(patternType, category, sorted),

    entry_ids: sorted.map((entry) => entry.id),

    mood_score_avg: averageMood(sorted),

    date_range_start: new Date(sorted[0].created_at).toISOString(),

    date_range_end: new Date(
      sorted[sorted.length - 1].created_at,
    ).toISOString(),
  };
}

// --------------------------------------------------
// Detect recurring patterns
// --------------------------------------------------

export function detectPatterns(entries) {
  const groups = new Map();

  for (const entry of entries) {
    // ----------------------------------------------
    // Relationship patterns
    // ----------------------------------------------

    const relationship = cleanCategory(entry.relationship_source);

    if (relationship) {
      const key = `relationship:${relationship}`;

      if (!groups.has(key)) {
        groups.set(key, {
          patternType: "relationship",

          category: relationship,

          entries: [],
        });
      }

      groups.get(key).entries.push(entry);
    }

    // ----------------------------------------------
    // Situational patterns
    // ----------------------------------------------

    const stressor = cleanCategory(entry.stressor_type);

    if (stressor) {
      const key = `situational:${stressor}`;

      if (!groups.has(key)) {
        groups.set(key, {
          patternType: "situational",

          category: stressor,

          entries: [],
        });
      }

      groups.get(key).entries.push(entry);
    }
  }

  const patterns = [];

  for (const group of groups.values()) {
    /*
     * A pattern needs at least
     * three supporting entries.
     */
    if (group.entries.length < 3) {
      continue;
    }

    patterns.push(
      buildPattern(group.patternType, group.category, group.entries),
    );
  }

  /*
   * Stronger recurrence first.
   *
   * If two patterns have the same
   * number of entries, the newer
   * pattern wins.
   */
  patterns.sort((a, b) => {
    const countDifference = b.entry_ids.length - a.entry_ids.length;

    if (countDifference !== 0) {
      return countDifference;
    }

    return new Date(b.date_range_end) - new Date(a.date_range_end);
  });

  return patterns.slice(0, 3);
}

// --------------------------------------------------
// Refresh patterns if this is a milestone entry
// --------------------------------------------------

export async function refreshPatternsIfDue(userId) {
  const processedCount = await getProcessedEntryCount(userId);

  /*
   * Original Lumio design:
   * refresh after every fifth
   * processed journal entry.
   */

  if (processedCount < 5 || processedCount % 5 !== 0) {
    return {
      refreshed: false,
      processedCount,
    };
  }

  const entries = await getPatternSourceEntries(userId);

  const patterns = detectPatterns(entries);

  /*
   * Important:
   *
   * If no real recurring patterns
   * exist, keep the user's previous
   * patterns rather than replacing
   * them with nothing.
   */

  if (patterns.length === 0) {
    return {
      refreshed: false,
      processedCount,
      reason: "no_supported_patterns",
    };
  }

  await replaceActivePatterns(userId, patterns);

  return {
    refreshed: true,
    processedCount,
    patternCount: patterns.length,
  };
}
