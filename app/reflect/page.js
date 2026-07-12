"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ReflectPage() {
  const [reflection, setReflection] = useState(null);
  const [hasReflection, setHasReflection] = useState(false);
  const [entriesThisWeek, setEntriesThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("lumio_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadReflection = async () => {
      try {
        const res = await fetch("/api/v1/reflections", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (res.ok && json?.success) {
          setReflection(json.data?.reflection ?? null);
          setHasReflection(Boolean(json.data?.has_reflection));
          setEntriesThisWeek(json.data?.entries_this_week ?? 0);
        }
      } catch (err) {
        console.error("Failed to load reflection", err);
      } finally {
        setLoading(false);
      }
    };

    loadReflection();
  }, [router]);

  const getWeekRangeLabel = () => {
    const now = new Date();
    const day = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day);
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const format = (date) =>
      date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${format(sunday)} — ${format(saturday)}`;
  };

  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <Navbar activePage="reflect" />

      <main style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
          <div
            style={{
              fontSize: 12,
              color: "#7C6EF5",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            Weekly Reflection
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F4F0",
              marginBottom: 4,
            }}
          >
            {getWeekRangeLabel()}
          </h1>

          <p style={{ fontSize: 14, color: "#9B9AAF", marginBottom: 32 }}>
            Your emotional summary for this week.
          </p>

          {loading ? (
            <div style={{ color: "#9B9AAF", fontSize: 15 }}>
              Generating your reflection...
            </div>
          ) : !hasReflection ? (
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
                Your weekly reflection will be ready after 5 entries.
              </div>
              <div style={{ color: "#6B6A7E", fontSize: 13, marginBottom: 24 }}>
                {entriesThisWeek} of 5 entries this week
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
                    width: `${Math.min((entriesThisWeek / 5) * 100, 100)}%`,
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
                Write today&apos;s entry →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16 }}>
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
                    style={{ fontSize: 12, color: "#6B6A7E", marginBottom: 4 }}
                  >
                    Best moment
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#4CAF82",
                    }}
                  >
                    {reflection?.mood_arc?.high?.score ?? 0}/10
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6A7E", marginTop: 4 }}>
                    {reflection?.mood_arc?.high?.day ?? "—"}
                  </div>
                </div>

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
                    style={{ fontSize: 12, color: "#6B6A7E", marginBottom: 4 }}
                  >
                    Hardest moment
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#E05C5C",
                    }}
                  >
                    {reflection?.mood_arc?.low?.score ?? 0}/10
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6A7E", marginTop: 4 }}>
                    {reflection?.mood_arc?.low?.day ?? "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#1A1A24",
                  border: "1px solid #2A2A3A",
                  borderRadius: 12,
                  padding: 28,
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B6A7E",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 16,
                  }}
                >
                  This week
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: "#F5F4F0",
                    lineHeight: 1.8,
                    fontFamily: "var(--font-lora), Georgia, serif",
                  }}
                >
                  {reflection?.content}
                </div>
              </div>

              <div
                style={{
                  marginTop: 24,
                  fontSize: 13,
                  color: "#6B6A7E",
                  textAlign: "center",
                }}
              >
                Reflections are generated once per week from your entries.
              </div>
            </>
          )}

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link
              href="/journal"
              style={{
                color: "#7C6EF5",
                fontSize: 14,
                textDecoration: "none",
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
