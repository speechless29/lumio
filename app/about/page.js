"use client";

import { useState } from "react";
import Link from "next/link";

export default function AboutPage() {
  const [hovered, setHovered] = useState({});
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));
  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <header
        style={{
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          onMouseEnter={() => setHover("homeLink", true)}
          onMouseLeave={() => setHover("homeLink", false)}
          style={{
            color: hovered.homeLink ? "#DAD6FF" : "#F5F4F0",
            fontWeight: 600,
            fontSize: 18,
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          Lumio
        </Link>

        <Link
          href="/signup"
          onMouseEnter={() => setHover("signupLink", true)}
          onMouseLeave={() => setHover("signupLink", false)}
          style={{
            color: "#7C6EF5",
            fontSize: 14,
            textDecoration: "none",
            backgroundColor: hovered.signupLink ? "#6B5DE4" : "transparent",
            padding: "8px 14px",
            borderRadius: 999,
            transition: "background-color 0.2s, color 0.2s",
          }}
        >
          Start writing
        </Link>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px" }}>
        <div
          style={{
            fontSize: 12,
            color: "#7C6EF5",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 16,
          }}
        >
          About the AI
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#F5F4F0",
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          What Lumio&apos;s AI does — and doesn&apos;t do
        </h1>

        <p
          style={{
            color: "#9B9AAF",
            fontSize: 16,
            lineHeight: 1.8,
            marginBottom: 48,
          }}
        >
          Lumio uses AI to help you understand your emotional patterns over
          time. This page explains exactly how it works, what it can and cannot
          do, and how your data is handled.
        </p>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#F5F4F0",
              marginBottom: 12,
            }}
          >
            What the AI does
          </h2>
          <p
            style={{
              color: "#9B9AAF",
              fontSize: 15,
              lineHeight: 1.8,
              marginBottom: 40,
            }}
          >
            When you save a journal entry, Lumio&apos;s AI reads it and extracts
            a mood score, an emotion label, and identifies the most prominent
            relationship or situation mentioned. It uses this to build a picture
            of your emotional patterns over time — surfacing recurring people,
            situations, and feelings that you might not notice on your own.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#F5F4F0",
              marginBottom: 12,
            }}
          >
            What the AI doesn&apos;t do
          </h2>
          <p
            style={{
              color: "#9B9AAF",
              fontSize: 15,
              lineHeight: 1.8,
              marginBottom: 40,
            }}
          >
            Lumio&apos;s AI does not diagnose mental health conditions. It does
            not give advice or tell you what to do. It does not make judgments
            about you or the people in your life. It states observations only —
            never causes, never conclusions. If you write about your roommate
            three times in a week, it might notice that pattern. It will never
            tell you what that means.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#F5F4F0",
              marginBottom: 12,
            }}
          >
            Your data
          </h2>
          <p
            style={{
              color: "#9B9AAF",
              fontSize: 15,
              lineHeight: 1.8,
              marginBottom: 40,
            }}
          >
            Your journal entries are private to your account and never shared
            with other users. Lumio currently uses Google&apos;s Gemini API to
            process entries. As with any AI API, entries are sent to
            Google&apos;s servers for processing. We do not sell your data. If
            you have questions or want your data deleted, contact us.
          </p>
        </section>

        <div
          style={{
            height: 1,
            backgroundColor: "#2A2A3A",
            marginBottom: 40,
          }}
        />

        <div
          style={{
            fontSize: 13,
            color: "#6B6A7E",
            lineHeight: 1.7,
            padding: 20,
            backgroundColor: "#1A1A24",
            borderRadius: 12,
            border: "1px solid #2A2A3A",
          }}
        >
          Lumio is not a substitute for professional mental health support. If
          you&apos;re struggling, please reach out to someone you trust or a
          mental health professional.
        </div>

        <div style={{ marginTop: 40 }}>
          <Link
            href="/"
            onMouseEnter={() => setHover("backLink", true)}
            onMouseLeave={() => setHover("backLink", false)}
            style={{
              color: hovered.backLink ? "#F5F4F0" : "#7C6EF5",
              fontSize: 14,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            ← Back to Lumio
          </Link>
        </div>
      </main>
    </div>
  );
}
