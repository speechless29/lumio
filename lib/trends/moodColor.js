/**
 * Maps a mood_score to a calendar dot color.
 *
 * ASSUMPTION: mood_score is on a 1-10 scale (README example showed
 * mood_score: 4). Adjust MOOD_SCALE_MAX and the thresholds below if your
 * actual scale differs (e.g. 1-5).
 */

export const MOOD_SCALE_MAX = 10;

export const THRESHOLDS = {
  // avg_mood <= LOW  -> red
  // avg_mood <= MID  -> amber
  // avg_mood >  MID  -> green
  low: 4,
  mid: 6.5,
};

export const COLORS = {
  red: "red",
  amber: "amber",
  green: "green",
};

/**
 * @param {number|null} avgMood - average mood_score for a day, or null/undefined
 *   if there were no processed entries that day.
 * @returns {'red'|'amber'|'green'|null}
 */
export function moodToColor(avgMood) {
  if (avgMood === null || avgMood === undefined) return null;

  if (avgMood <= THRESHOLDS.low) return COLORS.red;
  if (avgMood <= THRESHOLDS.mid) return COLORS.amber;
  return COLORS.green;
}
