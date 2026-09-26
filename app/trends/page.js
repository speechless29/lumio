"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import CalendarView from "./CalendarView";

export default function TrendsPage() {
  const [tooltip, setTooltip] = useState(null);
  const [dataPoints, setDataPoints] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [highlightedEntryIds, setHighlightedEntryIds] = useState([]);
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
    setLoading(true);

    const fetchTrends = async () => {
      try {
        const trendsRes = await fetch(
          `/api/v1/trends?range=${encodeURIComponent(range)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const trendsJson = await trendsRes.json();
        if (mounted) {
          const dp = trendsJson?.data?.data_points ?? [];
          setDataPoints(dp);
          setTotalEntries(trendsJson?.data?.total_entries ?? 0);
          setHasEnoughData(Boolean(trendsJson?.data?.has_enough_data));
        }

        const patternsRes = await fetch(`/api/v1/trends/patterns`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const patternsJson = await patternsRes.json();
        if (mounted) {
          setPatterns(patternsJson?.data?.patterns ?? []);
        }
      } catch (err) {
        console.error("Failed to load trends", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTrends();
    return () => {
      mounted = false;
    };
  }, [range, router]);

  const handleRange = (r) => {
    setRange(r);
    setHighlightedEntryIds([]);
    setTooltip(null);
  };

  const toggleHighlight = (entryIds = []) => {
    const currentKey = JSON.stringify(highlightedEntryIds.slice().sort());
    const newKey = JSON.stringify((entryIds || []).slice().sort());
    if (currentKey === newKey) {
      setHighlightedEntryIds([]);
    } else {
      setHighlightedEntryIds(entryIds || []);
    }
  };

  const averageMood =
    dataPoints.length > 0
      ? dataPoints.reduce((sum, dp) => sum + (dp.mood_score || 0), 0) /
        dataPoints.length
      : 0;

  function getBarColor(score) {
    if (score <= 3) return "#E05C5C";
    if (score <= 5) return "#E8A44A";
    if (score <= 7) return "#7C6EF5";
    return "#4CAF82";
  }

  function formatShortDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  const normalizeDateKey = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDateKeys = new Set(
    dataPoints.map((dp) => normalizeDateKey(dp.created_at)),
  );
  let currentStreak = 0;
  let dayOffset = 0;
  while (dayOffset < 365) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - dayOffset);
    const hasEntry = entryDateKeys.has(normalizeDateKey(checkDate));
    if (hasEntry) {
      currentStreak += 1;
      dayOffset += 1;
    } else if (dayOffset === 0) {
      dayOffset = 1;
    } else {
      break;
    }
  }

  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <Navbar activePage="trends" />

      <main style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F4F0",
              marginBottom: 4,
            }}
          >
            Your patterns
          </h1>
          <p style={{ fontSize: 14, color: "#9B9AAF", marginBottom: 32 }}>
            Your emotional trends over time.
          </p>

          {/* Range toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {[
              { label: "7 days", value: "7d" },
              { label: "30 days", value: "30d" },
              { label: "All time", value: "all" },
            ].map((btn) => {
              const active = range === btn.value;
              const isHov = Boolean(hovered[`range-${btn.value}`]);
              return (
                <button
                  key={btn.value}
                  onClick={() => handleRange(btn.value)}
                  onMouseEnter={() => setHover(`range-${btn.value}`, true)}
                  onMouseLeave={() => setHover(`range-${btn.value}`, false)}
                  style={{
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    backgroundColor: active
                      ? "#7C6EF5"
                      : isHov
                        ? "#232331"
                        : "#1A1A24",
                    color: active ? "#FFFFFF" : isHov ? "#F5F4F0" : "#9B9AAF",
                    border: active
                      ? "none"
                      : isHov
                        ? "1px solid #7C6EF5"
                        : "1px solid #2A2A3A",
                    transition:
                      "background-color 0.2s, border-color 0.2s, color 0.2s",
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ color: "#9B9AAF" }}>Loading...</div>
          ) : !hasEnoughData ? (
            <div
              style={{
                backgroundColor: "#1A1A24",
                border: "1px solid #2A2A3A",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ color: "#9B9AAF", fontSize: 15, marginBottom: 16 }}>
                Your patterns will appear here after a few more entries.
              </div>
              <div style={{ color: "#6B6A7E", fontSize: 13, marginBottom: 24 }}>
                {totalEntries} of 5 entries to your first insight
              </div>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: "#2A2A3A",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: `${Math.min((totalEntries / 5) * 100, 100)}%`,
                    height: 4,
                    backgroundColor: "#7C6EF5",
                    borderRadius: 999,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <Link
                href="/journal"
                onMouseEnter={() => setHover("writeAnotherLink", true)}
                onMouseLeave={() => setHover("writeAnotherLink", false)}
                style={{
                  color: hovered.writeAnotherLink ? "#F5F4F0" : "#7C6EF5",
                  fontSize: 14,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                Write another entry →
              </Link>
            </div>
          ) : (
            <>
              {/* Stats + calendar */}
              <div
                style={{
                  backgroundColor: "#1A1A24",
                  border: "1px solid #2A2A3A",
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 24,
                  position: "relative",
                }}
              >
                {/* Stats row */}
                <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                  {[
                    {
                      label: "Average Mood",
                      value: `${averageMood.toFixed(1)}/10`,
                    },
                    { label: "Entries", value: dataPoints.length },
                    {
                      label: "Streak",
                      value:
                        currentStreak === 1 ? "1 day" : `${currentStreak} days`,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        backgroundColor: "#1A1A24",
                        border: "1px solid #2A2A3A",
                        borderRadius: 12,
                        padding: "16px 20px",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B6A7E",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 4,
                        }}
                      >
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#F5F4F0",
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <CalendarView />
              </div>

              {/* Patterns */}
              {patterns.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B6A7E",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 16,
                    }}
                  >
                    Detected patterns
                  </div>
                  {patterns.map((pattern) => {
                    const isActive =
                      JSON.stringify(
                        (pattern.entry_ids || []).slice().sort(),
                      ) ===
                      JSON.stringify(
                        (highlightedEntryIds || []).slice().sort(),
                      );
                    const isHov = Boolean(hovered[`pattern-${pattern.id}`]);
                    return (
                      <div
                        key={pattern.id}
                        onClick={() => toggleHighlight(pattern.entry_ids || [])}
                        onMouseEnter={() =>
                          setHover(`pattern-${pattern.id}`, true)
                        }
                        onMouseLeave={() =>
                          setHover(`pattern-${pattern.id}`, false)
                        }
                        style={{
                          backgroundColor: "#1A1A24",
                          border:
                            isHov || isActive
                              ? "1px solid #7C6EF5"
                              : "1px solid #2A2A3A",
                          borderRadius: 12,
                          padding: 20,
                          marginBottom: 12,
                          cursor: "pointer",
                          outline: isActive
                            ? "2px solid rgba(124,110,245,0.15)"
                            : "none",
                          transition: "border-color 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-block",
                            marginBottom: 8,
                            backgroundColor: "rgba(124,110,245,0.15)",
                            border: "1px solid #7C6EF5",
                            borderRadius: 999,
                            padding: "4px 12px",
                            fontSize: 12,
                            color: "#7C6EF5",
                          }}
                        >
                          {pattern.category}
                        </div>
                        <div
                          style={{
                            color: "#9B9AAF",
                            fontSize: 14,
                            lineHeight: 1.6,
                            marginTop: 8,
                          }}
                        >
                          {pattern.description}
                        </div>
                        <div
                          style={{
                            color: "#6B6A7E",
                            fontSize: 11,
                            marginTop: 8,
                          }}
                        >
                          Tap to highlight on chart
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link
              href="/journal"
              onMouseEnter={() => setHover("writeTodayLink", true)}
              onMouseLeave={() => setHover("writeTodayLink", false)}
              style={{
                color: hovered.writeTodayLink ? "#F5F4F0" : "#7C6EF5",
                fontSize: 14,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Write today&apos;s entry →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
