"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function TrendsPage() {
  const [dataPoints, setDataPoints] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [highlightedEntryIds, setHighlightedEntryIds] = useState([]);
  const router = useRouter();

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
          {
            headers: { Authorization: `Bearer ${token}` },
          },
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
  };

  const toggleHighlight = (entryIds = []) => {
    // toggle: if same array (stringified) -> clear, else set
    const currentKey = JSON.stringify(highlightedEntryIds.slice().sort());
    const newKey = JSON.stringify((entryIds || []).slice().sort());
    if (currentKey === newKey) {
      setHighlightedEntryIds([]);
    } else {
      setHighlightedEntryIds(entryIds || []);
    }
  };

  const bars = dataPoints || [];
  const percentWidth = (val) => `${Math.max((val / 10) * 100, 4)}%`;
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

  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <Navbar activePage="trends" />

      {/* Main */}
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
              return (
                <button
                  key={btn.value}
                  onClick={() => handleRange(btn.value)}
                  style={{
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    backgroundColor: active ? "#7C6EF5" : "#1A1A24",
                    color: active ? "#FFFFFF" : "#9B9AAF",
                    border: active ? "none" : "1px solid #2A2A3A",
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
            /* Empty state */
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
                    maxWidth: "100%",
                    height: 4,
                    backgroundColor: "#7C6EF5",
                    borderRadius: 999,
                    transition: "width 0.3s",
                  }}
                />
              </div>

              <Link
                href="/journal"
                style={{
                  color: "#7C6EF5",
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Write another entry →
              </Link>
            </div>
          ) : (
            /* Chart + patterns */
            <>
              {/* Chart */}
              <div
                style={{
                  backgroundColor: "#1A1A24",
                  border: "1px solid #2A2A3A",
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                {/* Stats row */}
                <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                  <div
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
                      Average mood
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#F5F4F0",
                      }}
                    >
                      {dataPoints && dataPoints.length > 0
                        ? `${averageMood.toFixed(1)}/10`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#1A1A24",
                      border: "1px solid #2A2A3A",
                      borderRadius: 12,
                      padding: "16px 20px",
                      width: 160,
                      textAlign: "left",
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
                      Entries tracked
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#F5F4F0",
                      }}
                    >
                      {dataPoints?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                    position: "relative",
                  }}
                >
                  {bars.length === 0 ? (
                    <div style={{ color: "#9B9AAF" }}>No data points</div>
                  ) : (
                    bars.map((dp) => {
                      const isHighlighted = highlightedEntryIds.includes(dp.id);
                      const opacity =
                        highlightedEntryIds.length === 0
                          ? 1
                          : isHighlighted
                            ? 1
                            : 0.4;
                      const h = (dp.mood_score ?? 0) / 10;
                      const heightStyle = `${Math.max(h * 100, 4)}%`;
                      const bg = getBarColor(dp.mood_score);
                      return (
                        <div
                          key={dp.id}
                          title={`${dp.mood_label || "Unknown"} · ${new Date(
                            dp.created_at,
                          ).toLocaleDateString()}`}
                          style={{
                            flex: 1,
                            minHeight: 4,
                            height: heightStyle,
                            borderRadius: "4px 4px 0 0",
                            backgroundColor: bg,
                            opacity,
                            transition: "opacity 0.15s, height 0.2s",
                          }}
                        />
                      );
                    })
                  )}
                </div>

                {/* Date labels */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                    {dataPoints && dataPoints.length > 0
                      ? formatShortDate(dataPoints[0].created_at)
                      : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                    {dataPoints && dataPoints.length > 0
                      ? formatShortDate(
                          dataPoints[dataPoints.length - 1].created_at,
                        )
                      : "—"}
                  </div>
                </div>

                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#E05C5C",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                      Distressed (1-3)
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#E8A44A",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                      Low (4-5)
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#7C6EF5",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                      Okay (6-7)
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#4CAF82",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#6B6A7E" }}>
                      Positive (8-10)
                    </div>
                  </div>
                </div>
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
                    // assume pattern.entry_ids is an array of entry ids
                    const isActive =
                      JSON.stringify(
                        (pattern.entry_ids || []).slice().sort(),
                      ) ===
                      JSON.stringify(
                        (highlightedEntryIds || []).slice().sort(),
                      );
                    return (
                      <div
                        key={pattern.id}
                        onClick={() => toggleHighlight(pattern.entry_ids || [])}
                        style={{
                          backgroundColor: "#1A1A24",
                          border: "1px solid #2A2A3A",
                          borderRadius: 12,
                          padding: 20,
                          marginBottom: 12,
                          cursor: "pointer",
                          outline: isActive
                            ? "2px solid rgba(124,110,245,0.15)"
                            : "none",
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

          {/* Write CTA */}
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link
              href="/journal"
              style={{ color: "#7C6EF5", fontSize: 14, textDecoration: "none" }}
            >
              Write today's entry →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
