"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

const EMOTIONS = [
  "admiration",
  "amusement",
  "anger",
  "annoyance",
  "approval",
  "caring",
  "confusion",
  "curiosity",
  "desire",
  "disappointment",
  "disapproval",
  "disgust",
  "embarrassment",
  "excitement",
  "fear",
  "gratitude",
  "grief",
  "joy",
  "love",
  "nervousness",
  "optimism",
  "pride",
  "realization",
  "relief",
  "remorse",
  "sadness",
  "surprise",
  "neutral",
];

function getAIEmotions(entry) {
  if (!entry) return [];

  return [
    entry.mood_label,
    ...(Array.isArray(entry.secondary_emotions)
      ? entry.secondary_emotions
      : []),
  ].filter(Boolean);
}

function getDisplayedEmotions(entry) {
  if (Array.isArray(entry?.user_emotions) && entry.user_emotions.length > 0) {
    return entry.user_emotions;
  }

  return getAIEmotions(entry);
}

export default function JournalPage() {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(true);

  const [savedEntry, setSavedEntry] = useState(null);

  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);

  const [error, setError] = useState("");
  const [hovered, setHovered] = useState({});
  const [showCheckin, setShowCheckin] = useState(false);

  const [editingEmotions, setEditingEmotions] = useState(false);
  const [selectedEmotions, setSelectedEmotions] = useState([]);

  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const activePollId = useRef(null);

  const setHover = (name, value) => {
    setHovered((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Load entries
  // --------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("lumio_token");

    if (!token) {
      router.push("/login");
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/v1/entries", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!mounted) return;

        const loadedEntries = json?.data?.entries ?? [];

        setEntries(loadedEntries);

        if (loadedEntries.length > 0) {
          const lastEntry = loadedEntries[0];

          const lastEntryDate = new Date(lastEntry.created_at);

          const now = new Date();

          const hoursSince = (now - lastEntryDate) / (1000 * 60 * 60);

          if (hoursSince >= 24) {
            setShowCheckin(Math.floor(hoursSince / 24));
          }
        }
      } catch (err) {
        console.error("Failed to load entries", err);
      } finally {
        if (mounted) {
          setEntriesLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // --------------------------------------------------
  // Analysis timer
  // --------------------------------------------------

  useEffect(() => {
    if (!savedEntry || savedEntry.ai_processed_at) {
      setAnalysisSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setAnalysisSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [savedEntry]);

  // --------------------------------------------------
  // Poll for AI result
  // --------------------------------------------------

  const pollForAI = (entryId) => {
    const token = localStorage.getItem("lumio_token");

    if (!token) return;

    activePollId.current = entryId;

    let attempts = 0;
    const maxAttempts = 45;

    const poll = async () => {
      if (activePollId.current !== entryId) {
        return;
      }

      attempts += 1;

      try {
        const res = await fetch(`/api/v1/entries/${entryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        const entry = json?.data ?? null;

        if (entry && entry.ai_processed_at) {
          setSavedEntry(entry);

          setEntries((prev) =>
            prev.map((existingEntry) =>
              existingEntry.id === entry.id ? entry : existingEntry,
            ),
          );

          setAnalysisTimedOut(false);
          activePollId.current = null;

          return;
        }
      } catch (err) {
        console.error("Polling error", err);
      }

      if (attempts >= maxAttempts) {
        setAnalysisTimedOut(true);
        activePollId.current = null;
        return;
      }

      setTimeout(poll, 1000);
    };

    setTimeout(poll, 800);
  };

  // --------------------------------------------------
  // Save journal entry
  // --------------------------------------------------

  const handleSave = async () => {
    if (content.trim().length < 10) {
      setError("Write a bit more before saving.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisTimedOut(false);
    setEditingEmotions(false);
    setFeedbackError("");

    const token = localStorage.getItem("lumio_token");

    if (!token) {
      setError("Missing auth token.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/entries", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          content,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const entry = json.data;

        setSavedEntry(entry);
        setAnalysisSeconds(0);

        setEntries((prev) => [entry, ...prev]);

        setContent("");
        setError("");
        setShowCheckin(false);

        pollForAI(entry.id);
      } else {
        setError(json.error?.message || "Failed to save entry.");
      }
    } catch (err) {
      setError(err.message || "Failed to save entry.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Update entry locally after feedback
  // --------------------------------------------------

  const applyUpdatedEntry = (updatedEntry) => {
    setSavedEntry(updatedEntry);

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === updatedEntry.id ? updatedEntry : entry,
      ),
    );
  };

  // --------------------------------------------------
  // Save emotion feedback
  // --------------------------------------------------

  const saveEmotionFeedback = async (emotions, feedback) => {
    if (!savedEntry) return;

    const token = localStorage.getItem("lumio_token");

    if (!token) {
      setFeedbackError("You need to sign in again.");
      return;
    }

    setFeedbackSaving(true);
    setFeedbackError("");

    try {
      const res = await fetch(`/api/v1/entries/${savedEntry.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          emotions,
          feedback,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Could not save your feedback.");
      }

      applyUpdatedEntry(json.data);

      setEditingEmotions(false);
      setSelectedEmotions([]);
    } catch (err) {
      setFeedbackError(err.message || "Could not save your feedback.");
    } finally {
      setFeedbackSaving(false);
    }
  };

  // --------------------------------------------------
  // Confirm AI emotions
  // --------------------------------------------------

  const handleConfirmEmotions = () => {
    const emotions = getAIEmotions(savedEntry);

    if (emotions.length === 0) return;

    saveEmotionFeedback(emotions, "confirmed");
  };

  // --------------------------------------------------
  // Open edit UI
  // --------------------------------------------------

  const handleEditEmotions = () => {
    const current = getDisplayedEmotions(savedEntry);

    setSelectedEmotions(current.slice(0, 3));

    setFeedbackError("");
    setEditingEmotions(true);
  };

  // --------------------------------------------------
  // Toggle emotion
  // --------------------------------------------------

  const toggleEmotion = (emotion) => {
    setSelectedEmotions((current) => {
      if (current.includes(emotion)) {
        return current.filter((item) => item !== emotion);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, emotion];
    });
  };

  // --------------------------------------------------
  // Save edited emotions
  // --------------------------------------------------

  const handleSaveEditedEmotions = () => {
    if (selectedEmotions.length < 1 || selectedEmotions.length > 3) {
      setFeedbackError("Choose between 1 and 3 emotions.");
      return;
    }

    saveEmotionFeedback(selectedEmotions, "edited");
  };

  // --------------------------------------------------
  // UI data
  // --------------------------------------------------

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const analysisDots = ".".repeat((analysisSeconds % 3) + 1);

  const displayedSavedEmotions = getDisplayedEmotions(savedEntry);

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <div
      style={{
        backgroundColor: "#0F0F14",
        minHeight: "100vh",
      }}
    >
      <Navbar activePage="journal" />

      <main
        style={{
          paddingTop: 80,
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          {/* Date */}

          <div
            style={{
              marginBottom: 16,
              fontSize: 13,
              color: "#6B6A7E",
            }}
          >
            {today}
          </div>

          {/* Check-in */}

          {showCheckin ? (
            <div
              style={{
                backgroundColor: "#1A1A24",
                border: "1px solid #2A2A3A",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,

                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    color: "#7C6EF5",
                  }}
                >
                  ✦
                </span>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#F5F4F0",
                    }}
                  >
                    You haven't written in{" "}
                    {showCheckin === 1 ? "a day" : `${showCheckin} days`}.
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#9B9AAF",
                      marginTop: 2,
                    }}
                  >
                    Start below when you're ready.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCheckin(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B6A7E",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Journal editor */}

          <textarea
            placeholder="What's on your mind today?"
            value={content}
            maxLength={10000}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: "100%",
              minHeight: 200,

              backgroundColor: "transparent",

              border: "none",
              outline: "none",
              resize: "none",

              color: "#F5F4F0",

              fontSize: 16,
              lineHeight: 1.8,

              fontFamily: "var(--font-lora), 'Be Vietnam Pro', sans-serif",
            }}
          />

          {/* Save row */}

          <div
            style={{
              marginTop: 12,

              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                color: "#6B6A7E",
                fontSize: 12,
              }}
            >
              {content.length}/10000
            </div>

            <button
              onClick={handleSave}
              disabled={content.trim().length < 10 || loading}
              onMouseEnter={() => setHover("saveButton", true)}
              onMouseLeave={() => setHover("saveButton", false)}
              style={{
                borderRadius: 8,
                padding: "10px 20px",

                fontSize: 14,
                fontWeight: 500,

                border: "none",

                cursor:
                  content.trim().length < 10 || loading
                    ? "not-allowed"
                    : "pointer",

                backgroundColor:
                  content.trim().length < 10 || loading
                    ? "#2A2A3A"
                    : hovered.saveButton
                      ? "#6B5DE4"
                      : "#7C6EF5",

                color:
                  content.trim().length < 10 || loading ? "#6B6A7E" : "#FFFFFF",
              }}
            >
              {loading ? "Saving..." : "Save entry"}
            </button>
          </div>

          {error ? (
            <div
              style={{
                color: "#E05C5C",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Latest AI result */}

          {savedEntry ? (
            <div
              style={{
                marginTop: 32,

                backgroundColor: "#1A1A24",

                border: "1px solid #2A2A3A",

                borderRadius: 12,
                padding: 24,
              }}
            >
              {savedEntry.ai_processed_at ? (
                <>
                  <div
                    style={{
                      color: "#9B9AAF",
                      fontSize: 11,

                      textTransform: "uppercase",

                      letterSpacing: "0.08em",

                      marginBottom: 10,
                    }}
                  >
                    {savedEntry.emotion_feedback
                      ? "Your emotions"
                      : "Lumio noticed"}
                  </div>

                  {/* Emotion chips */}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    {displayedSavedEmotions.map((emotion, index) => (
                      <div
                        key={emotion}
                        style={{
                          backgroundColor:
                            index === 0 ? "rgba(124,110,245,0.15)" : "#20202B",

                          border:
                            index === 0
                              ? "1px solid #7C6EF5"
                              : "1px solid #343445",

                          borderRadius: 999,

                          padding: "5px 12px",

                          fontSize: 12,

                          color: index === 0 ? "#7C6EF5" : "#B4B3C5",
                        }}
                      >
                        {emotion}

                        {index === 0 &&
                        savedEntry.mood_intensity &&
                        !savedEntry.emotion_feedback
                          ? ` · ${savedEntry.mood_intensity}`
                          : ""}
                      </div>
                    ))}
                  </div>

                  {/* Acknowledgment */}

                  <div
                    style={{
                      color: "#B4B3C5",
                      fontSize: 14,
                      lineHeight: 1.7,
                    }}
                  >
                    {savedEntry.ai_acknowledgment}
                  </div>

                  {/* Feedback */}

                  {!savedEntry.emotion_feedback && !editingEmotions ? (
                    <div
                      style={{
                        marginTop: 20,

                        paddingTop: 18,

                        borderTop: "1px solid #2A2A3A",
                      }}
                    >
                      <div
                        style={{
                          color: "#F5F4F0",

                          fontSize: 13,

                          marginBottom: 10,
                        }}
                      >
                        Does this feel right?
                      </div>

                      <div
                        style={{
                          display: "flex",

                          gap: 8,
                        }}
                      >
                        <button
                          onClick={handleConfirmEmotions}
                          disabled={feedbackSaving}
                          style={{
                            backgroundColor: "#7C6EF5",

                            color: "#FFFFFF",

                            border: "none",

                            borderRadius: 7,

                            padding: "8px 16px",

                            fontSize: 12,

                            cursor: feedbackSaving ? "wait" : "pointer",
                          }}
                        >
                          {feedbackSaving ? "Saving..." : "Yes"}
                        </button>

                        <button
                          onClick={handleEditEmotions}
                          disabled={feedbackSaving}
                          style={{
                            backgroundColor: "transparent",

                            color: "#B4B3C5",

                            border: "1px solid #343445",

                            borderRadius: 7,

                            padding: "8px 16px",

                            fontSize: 12,

                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Confirmed / edited status */}

                  {savedEntry.emotion_feedback && !editingEmotions ? (
                    <div
                      style={{
                        marginTop: 18,

                        paddingTop: 16,

                        borderTop: "1px solid #2A2A3A",

                        display: "flex",

                        justifyContent: "space-between",

                        alignItems: "center",

                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          color: "#9B9AAF",

                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            color: "#7C6EF5",
                          }}
                        >
                          ✓
                        </span>{" "}
                        {savedEntry.emotion_feedback === "confirmed"
                          ? "You confirmed these emotions."
                          : "You adjusted these emotions."}
                      </div>

                      <button
                        onClick={handleEditEmotions}
                        style={{
                          background: "none",

                          border: "none",

                          color: "#7C6EF5",

                          fontSize: 12,

                          cursor: "pointer",

                          padding: 0,
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}

                  {/* Emotion editor */}

                  {editingEmotions ? (
                    <div
                      style={{
                        marginTop: 20,

                        paddingTop: 18,

                        borderTop: "1px solid #2A2A3A",
                      }}
                    >
                      <div
                        style={{
                          color: "#F5F4F0",

                          fontSize: 13,

                          fontWeight: 500,

                          marginBottom: 4,
                        }}
                      >
                        How would you describe it?
                      </div>

                      <div
                        style={{
                          color: "#9B9AAF",

                          fontSize: 11,

                          marginBottom: 14,
                        }}
                      >
                        Choose up to 3 emotions.
                      </div>

                      <div
                        style={{
                          display: "flex",

                          flexWrap: "wrap",

                          gap: 7,
                        }}
                      >
                        {EMOTIONS.map((emotion) => {
                          const selected = selectedEmotions.includes(emotion);

                          const disabled =
                            !selected && selectedEmotions.length >= 3;

                          return (
                            <button
                              key={emotion}
                              onClick={() => toggleEmotion(emotion)}
                              disabled={disabled}
                              style={{
                                borderRadius: 999,

                                padding: "6px 11px",

                                fontSize: 11,

                                border: selected
                                  ? "1px solid #7C6EF5"
                                  : "1px solid #343445",

                                backgroundColor: selected
                                  ? "rgba(124,110,245,0.15)"
                                  : "#20202B",

                                color: selected
                                  ? "#9A90FF"
                                  : disabled
                                    ? "#555466"
                                    : "#B4B3C5",

                                cursor: disabled ? "not-allowed" : "pointer",
                              }}
                            >
                              {emotion}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          marginTop: 14,

                          color: "#6B6A7E",

                          fontSize: 11,
                        }}
                      >
                        {selectedEmotions.length}
                        /3 selected
                      </div>

                      {feedbackError ? (
                        <div
                          style={{
                            color: "#E05C5C",

                            fontSize: 12,

                            marginTop: 8,
                          }}
                        >
                          {feedbackError}
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",

                          gap: 8,

                          marginTop: 14,
                        }}
                      >
                        <button
                          onClick={handleSaveEditedEmotions}
                          disabled={
                            feedbackSaving || selectedEmotions.length === 0
                          }
                          style={{
                            backgroundColor: "#7C6EF5",

                            color: "#FFFFFF",

                            border: "none",

                            borderRadius: 7,

                            padding: "8px 16px",

                            fontSize: 12,

                            cursor: feedbackSaving ? "wait" : "pointer",
                          }}
                        >
                          {feedbackSaving ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={() => {
                            setEditingEmotions(false);

                            setFeedbackError("");
                          }}
                          disabled={feedbackSaving}
                          style={{
                            background: "none",

                            border: "none",

                            color: "#9B9AAF",

                            fontSize: 12,

                            cursor: "pointer",

                            padding: "8px 10px",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {feedbackError && !editingEmotions ? (
                    <div
                      style={{
                        color: "#E05C5C",

                        fontSize: 12,

                        marginTop: 10,
                      }}
                    >
                      {feedbackError}
                    </div>
                  ) : null}

                  {/* Chat */}

                  <button
                    onClick={() => router.push(`/chat/${savedEntry.id}`)}
                    style={{
                      marginTop: 18,

                      color: "#7C6EF5",

                      fontSize: 13,

                      background: "none",

                      border: "none",

                      cursor: "pointer",

                      padding: 0,
                    }}
                  >
                    Keep talking about this →
                  </button>
                </>
              ) : (
                <>
                  {/* Entry saved */}

                  <div
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: 7,

                      marginBottom: 16,

                      color: "#9B9AAF",

                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        color: "#7C6EF5",
                      }}
                    >
                      ✓
                    </span>
                    Entry saved
                  </div>

                  {/* Analysis status */}

                  <div
                    style={{
                      display: "flex",

                      alignItems: "flex-start",

                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 9,
                        height: 9,

                        borderRadius: "50%",

                        backgroundColor: analysisTimedOut
                          ? "#9B9AAF"
                          : "#7C6EF5",

                        boxShadow: analysisTimedOut
                          ? "none"
                          : "0 0 0 5px rgba(124,110,245,0.12)",

                        marginTop: 5,

                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          color: "#F5F4F0",

                          fontSize: 14,

                          fontWeight: 500,

                          marginBottom: 5,
                        }}
                      >
                        {analysisTimedOut
                          ? "Analysis is taking longer than expected"
                          : analysisSeconds < 8
                            ? `Analyzing your entry${analysisDots}`
                            : `Still analyzing${analysisDots}`}
                      </div>

                      <div
                        style={{
                          color: "#9B9AAF",

                          fontSize: 12,

                          lineHeight: 1.6,

                          maxWidth: 430,
                        }}
                      >
                        {analysisTimedOut
                          ? "Your entry is saved. Refresh later to check whether the analysis has finished."
                          : analysisSeconds < 8
                            ? "Lumio is looking for the emotions and context in what you wrote."
                            : "Your entry is safely saved. The analysis is taking a little longer than usual."}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Past entries divider */}

          <div
            style={{
              marginTop: 48,
              marginBottom: 32,

              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "#2A2A3A",
              }}
            />

            <div
              style={{
                fontSize: 12,
                color: "#6B6A7E",

                textTransform: "uppercase",

                letterSpacing: "0.1em",
              }}
            >
              Past entries
            </div>

            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "#2A2A3A",
              }}
            />
          </div>

          {/* Past entries */}

          {entriesLoading ? (
            <div
              style={{
                color: "#9B9AAF",
              }}
            >
              Loading entries...
            </div>
          ) : (
            <div>
              {entries.map((entry) => {
                const isHovered = Boolean(hovered[`entry-${entry.id}`]);

                const isProcessed = entry.ai_processed_at != null;

                const showAnalyzingLabel = !isProcessed && !entry.mood_label;

                const emotions = getDisplayedEmotions(entry);

                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (isProcessed) {
                        router.push(`/chat/${entry.id}`);
                      }
                    }}
                    onMouseEnter={() => setHover(`entry-${entry.id}`, true)}
                    onMouseLeave={() => setHover(`entry-${entry.id}`, false)}
                    style={{
                      marginBottom: 16,
                      padding: 20,

                      backgroundColor: isHovered ? "#1E1E2A" : "#1A1A24",

                      border: isHovered
                        ? "1px solid #7C6EF5"
                        : "1px solid #2A2A3A",

                      borderRadius: 12,

                      cursor: isProcessed ? "pointer" : "default",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B6A7E",
                        marginBottom: 8,
                      }}
                    >
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#9B9AAF",
                        lineHeight: 1.6,
                      }}
                    >
                      {entry.content.length > 120
                        ? `${entry.content.slice(0, 120)}...`
                        : entry.content}
                    </div>

                    {emotions.length > 0 ? (
                      <div
                        style={{
                          display: "flex",

                          flexWrap: "wrap",

                          gap: 6,

                          marginTop: 10,
                        }}
                      >
                        {emotions.map((emotion, index) => (
                          <div
                            key={emotion}
                            style={{
                              backgroundColor:
                                index === 0
                                  ? "rgba(124,110,245,0.15)"
                                  : "#20202B",

                              border:
                                index === 0
                                  ? "1px solid #7C6EF5"
                                  : "1px solid #343445",

                              borderRadius: 999,

                              padding: "4px 12px",

                              fontSize: 12,

                              color: index === 0 ? "#7C6EF5" : "#9B9AAF",
                            }}
                          >
                            {emotion}
                          </div>
                        ))}

                        {entry.emotion_feedback ? (
                          <div
                            style={{
                              display: "flex",

                              alignItems: "center",

                              fontSize: 10,

                              color: "#7C6EF5",

                              marginLeft: 3,
                            }}
                          >
                            ✓
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {showAnalyzingLabel ? (
                      <div
                        style={{
                          fontSize: 11,

                          color: "#6B6A7E",

                          fontStyle: "italic",

                          marginTop: 6,
                        }}
                      >
                        Analyzing...
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}

        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",

            padding: "0 24px 32px",

            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#6B6A7E",
              lineHeight: 1.8,
            }}
          >
            Lumio is not a substitute for professional mental health support.
            <br />
            If you need immediate support, find verified resources at{" "}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#9B9AAF",
                textDecoration: "none",
              }}
            >
              findahelpline.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
