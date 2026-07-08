"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState({});
  const router = useRouter();
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const token = data.token || data.data?.token;
        if (token) {
          localStorage.setItem("lumio_token", token);
          document.cookie = `lumio_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        }
        router.push("/onboarding");
      } else {
        setError(data.error?.message || "Registration failed.");
      }
    } catch (fetchError) {
      setError(fetchError.message || "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#0F0F14",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div
          style={{
            backgroundColor: "#1A1A24",
            border: "1px solid #2A2A3A",
            borderRadius: 16,
            padding: 40,
          }}
        >
          <Link
            href="/"
            onMouseEnter={() => setHover("homeLink", true)}
            onMouseLeave={() => setHover("homeLink", false)}
            style={{
              color: hovered.homeLink ? "#F5F4F0" : "#7C6EF5",
              fontSize: 14,
              marginBottom: 32,
              textDecoration: "none",
              display: "inline-block",
              transition: "color 0.2s",
            }}
          >
            Lumio
          </Link>

          <h1
            style={{
              color: "#F5F4F0",
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Create your account
          </h1>

          <p
            style={{
              color: "#9B9AAF",
              fontSize: 14,
              marginBottom: 32,
            }}
          >
            Start understanding your patterns.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#0F0F14",
                border: "1px solid #2A2A3A",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#F5F4F0",
                fontSize: 14,
                outline: "none",
              }}
            />

            <input
              type="password"
              placeholder="Password (min. 8 characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#0F0F14",
                border: "1px solid #2A2A3A",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#F5F4F0",
                fontSize: 14,
                outline: "none",
                marginTop: 12,
              }}
            />

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

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setHover("createButton", true)}
              onMouseLeave={() => setHover("createButton", false)}
              style={{
                width: "100%",
                backgroundColor: hovered.createButton ? "#6B5DE4" : "#7C6EF5",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                marginTop: 20,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#6B6A7E",
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, height: 1, backgroundColor: "#2A2A3A" }} />
            <span>or</span>
            <span style={{ flex: 1, height: 1, backgroundColor: "#2A2A3A" }} />
          </div>

          <button
            type="button"
            onMouseEnter={() => setHover("googleButton", true)}
            onMouseLeave={() => setHover("googleButton", false)}
            style={{
              width: "100%",
              backgroundColor: hovered.googleButton ? "#232330" : "#1A1A24",
              border: hovered.googleButton
                ? "1px solid #7C6EF5"
                : "1px solid #2A2A3A",
              color: "#F5F4F0",
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              cursor: "pointer",
              marginTop: 12,
              transition: "background-color 0.2s, border-color 0.2s",
            }}
          >
            Continue with Google
          </button>

          <p
            style={{
              marginTop: 24,
              fontSize: 13,
              color: "#6B6A7E",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              onMouseEnter={() => setHover("loginLink", true)}
              onMouseLeave={() => setHover("loginLink", false)}
              style={{
                color: hovered.loginLink ? "#F5F4F0" : "#7C6EF5",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
