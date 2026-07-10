"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [hovered, setHovered] = useState({});
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));
  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: "rgba(15,15,20,0.92)",
          borderBottom: "1px solid #2A2A3A",
          backdropFilter: "blur(12px)",
          height: "64px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#F5F4F0", fontWeight: 600, fontSize: "18px" }}>
            Lumio
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/login"
              onMouseEnter={() => setHover("loginLink", true)}
              onMouseLeave={() => setHover("loginLink", false)}
              style={{
                color: hovered.loginLink ? "#F5F4F0" : "#9B9AAF",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onMouseEnter={() => setHover("signupLink", true)}
              onMouseLeave={() => setHover("signupLink", false)}
              style={{
                backgroundColor: hovered.signupLink ? "#6B5DE4" : "#7C6EF5",
                color: "white",
                padding: "8px 20px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background-color 0.2s",
              }}
            >
              Start writing
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#F5F4F0",
              fontFamily: "var(--font-lora), Georgia, serif",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            Talk it out. Watch the same moments surface again.
          </h1>
          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.7,
              color: "#9B9AAF",
              maxWidth: "480px",
              margin: "0 auto 40px",
            }}
          >
            It remembers your roommate, your last deadline, your last bad week —
            and tells you when they&apos;re connected.
          </p>
          <Link
            href="/signup"
            onMouseEnter={() => setHover("heroSignupLink", true)}
            onMouseLeave={() => setHover("heroSignupLink", false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: hovered.heroSignupLink ? "#6B5DE4" : "#7C6EF5",
              color: "white",
              padding: "14px 36px",
              borderRadius: "999px",
              fontSize: "15px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
          >
            Start writing
          </Link>
          <p
            style={{
              marginTop: "16px",
              fontSize: "13px",
              color: "#6B6A7E",
            }}
          >
            Not therapy. Not a diagnosis. Just a clearer view of your own
            patterns.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          padding: "80px 24px",
          backgroundColor: "#0F0F14",
        }}
      >
        <div
          style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}
        >
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#6B6A7E",
              marginBottom: "48px",
            }}
          >
            How it works
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
            }}
          >
            {[
              {
                icon: "✍️",
                title: "Talk or write",
                desc: "Journal freely, or talk it through — whatever fits the moment.",
              },
              {
                icon: "🔍",
                title: "It listens, quietly",
                desc: "No real-time advice, no interruptions. It just remembers.",
              },
              {
                icon: "✨",
                title: "Patterns surface, in time",
                desc: "After a few entries, you start seeing what keeps coming back.",
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  backgroundColor: "#1A1A24",
                  border: "1px solid #2A2A3A",
                  borderRadius: "16px",
                  padding: "28px",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "16px" }}>
                  {card.icon}
                </div>
                <h3
                  style={{
                    color: "#F5F4F0",
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "10px",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    color: "#9B9AAF",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #2A2A3A",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#6B6A7E", fontSize: "13px", marginBottom: "8px" }}>
          Your entries are private to your account and never shared with other
          users.
        </p>
        <Link
          href="/about"
          onMouseEnter={() => setHover("aboutLink", true)}
          onMouseLeave={() => setHover("aboutLink", false)}
          style={{
            color: hovered.aboutLink ? "#9B9AAF" : "#6B6A7E",
            fontSize: "13px",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          About the AI →
        </Link>
      </footer>
    </div>
  );
}
