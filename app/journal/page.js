"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [savedEntry, setSavedEntry] = useState(null);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState({});
  const router = useRouter();
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));

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
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (mounted) {
          setEntries(json?.data?.entries ?? []);
        }
      } catch (err) {
        console.error("Failed to load entries", err);
      } finally {
        if (mounted) setEntriesLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const pollForAI = (entryId) => {
    const token = localStorage.getItem("lumio_token");
    if (!token) return;

    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/v1/entries/${entryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const entry = json?.data ?? null;
        if (entry && entry.ai_processed_at) {
          setSavedEntry(entry);
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? entry : e)),
          );
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error", err);
        if (attempts >= maxAttempts) clearInterval(interval);
      }
    }, 2000);

    // safety: clear after timeout as well
    setTimeout(() => clearInterval(interval), maxAttempts * 2000 + 2000);
  };

  const handleSave = async () => {
    if (content.trim().length < 10) {
      setError("Write a bit more before saving.");
      return;
    }

    setLoading(true);
    setError("");
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
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const entry = json.data;
        setSavedEntry(entry);
        setEntries((prev) => [entry, ...prev]);
        setContent("");
        setError("");
        // start polling for AI processing
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <Navbar activePage="journal" />

      {/* Main */}
      <main style={{ paddingTop: 80 }}>
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          <div style={{ marginBottom: 16, fontSize: 13, color: "#6B6A7E" }}>
            {today}
          </div>

          <div>
            <textarea
              placeholder="What's on your mind today?"
              value={content}
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
                fontFamily: "Georgia, serif",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#6B6A7E", fontSize: 12 }}>
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
                transition: "background-color 0.2s",
              }}
            >
              {loading ? "Saving..." : "Save entry"}
            </button>
          </div>

          {error ? (
            <div style={{ color: "#E05C5C", fontSize: 13, marginTop: 8 }}>
              {error}
            </div>
          ) : null}

          {/* AI Acknowledgment Card */}
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
                  {savedEntry.mood_label ? (
                    <div
                      style={{
                        display: "inline-block",
                        marginBottom: 12,
                        backgroundColor: "rgba(124,110,245,0.15)",
                        border: "1px solid #7C6EF5",
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: 12,
                        color: "#7C6EF5",
                      }}
                    >
                      {savedEntry.mood_label} · {savedEntry.mood_intensity}
                    </div>
                  ) : null}

                  <div
                    style={{ color: "#9B9AAF", fontSize: 14, lineHeight: 1.7 }}
                  >
                    {savedEntry.ai_acknowledgment}
                  </div>

                  <button
                    onClick={() => router.push(`/chat/${savedEntry.id}`)}
                    style={{
                      marginTop: 16,
                      color: "#7C6EF5",
                      fontSize: 13,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Keep talking about this →
                  </button>
                </>
              ) : (
                <div
                  style={{
                    color: "#6B6A7E",
                    fontSize: 14,
                    fontStyle: "italic",
                  }}
                >
                  Listening...
                </div>
              )}
            </div>
          ) : null}

          {/* Divider */}
          <div
            style={{
              marginTop: 48,
              marginBottom: 32,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: "#2A2A3A" }} />
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
            <div style={{ flex: 1, height: 1, backgroundColor: "#2A2A3A" }} />
          </div>

          {/* Entries list */}
          {entriesLoading ? (
            <div style={{ color: "#9B9AAF" }}>Loading entries...</div>
          ) : (
            <div>
              {entries.map((entry) => {
                const isHovered = Boolean(hovered[`entry-${entry.id}`]);
                const isProcessed = entry.ai_processed_at != null;
                const showAnalyzingLabel =
                  entry.ai_processed_at == null && entry.mood_label == null;

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
                      transition: "border-color 0.2s, background-color 0.2s",
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
                    {entry.mood_label ? (
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          backgroundColor: "rgba(124,110,245,0.15)",
                          border: "1px solid #7C6EF5",
                          borderRadius: 999,
                          padding: "4px 12px",
                          fontSize: 12,
                          color: "#7C6EF5",
                        }}
                      >
                        {entry.mood_label}
                      </div>
                    ) : null}
                    {showAnalyzingLabel ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B6A7E",
                          fontStyle: "italic",
                          marginTop: 4,
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
      </main>
    </div>
  );
}
