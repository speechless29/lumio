"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const options = [
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "romantic_partner", label: "Romantic partner" },
  { id: "roommate", label: "Roommate" },
  { id: "coworker_boss", label: "Coworker or boss" },
  { id: "academic", label: "School or career stress" },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState({});
  const router = useRouter();
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));

  const toggleOption = (id) => {
    setSelected((current) => {
      if (id === "prefer_not_to_say") {
        return current.includes(id) ? [] : ["prefer_not_to_say"];
      }

      if (current.includes("prefer_not_to_say")) {
        const next = current.filter((item) => item !== "prefer_not_to_say");
        return next.includes(id)
          ? next.filter((item) => item !== id)
          : [...next, id];
      }

      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });
  };

  const handleContinue = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("lumio_token");
      if (!token) {
        setError("Missing auth token.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/v1/users/me/tags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ relationship_tags: selected }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push("/journal");
      } else {
        setError(data.error?.message || "Unable to save your selections.");
      }
    } catch (fetchError) {
      setError(fetchError.message || "Unable to save your selections.");
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
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#1A1A24",
          border: "1px solid #2A2A3A",
          borderRadius: 16,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div />
          <span style={{ fontSize: 12, color: "#6B6A7E" }}>Step 1 of 1</span>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F4F0",
            marginBottom: 8,
          }}
        >
          Who do you find yourself in conflict with most these days?
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#9B9AAF",
            marginBottom: 32,
          }}
        >
          Select all that apply.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            const isHovered = Boolean(hovered[`option-${option.id}`]);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                onMouseEnter={() => setHover(`option-${option.id}`, true)}
                onMouseLeave={() => setHover(`option-${option.id}`, false)}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  cursor: "pointer",
                  border: isSelected
                    ? "1px solid #7C6EF5"
                    : isHovered
                      ? "1px solid #7C6EF5"
                      : "1px solid #2A2A3A",
                  backgroundColor: isSelected
                    ? "rgba(124,110,245,0.15)"
                    : isHovered
                      ? "#1A1A28"
                      : "#0F0F14",
                  color: isSelected || isHovered ? "#F5F4F0" : "#9B9AAF",
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: "left",
                  transition:
                    "background-color 0.2s, border-color 0.2s, color 0.2s",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div
            style={{
              color: "#E05C5C",
              fontSize: 13,
              marginTop: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.length === 0 || loading}
          onMouseEnter={() => setHover("continueButton", true)}
          onMouseLeave={() => setHover("continueButton", false)}
          style={{
            width: "100%",
            marginTop: 24,
            backgroundColor:
              selected.length === 0 || loading
                ? "#2A2A3A"
                : hovered.continueButton
                  ? "#6B5DE4"
                  : "#7C6EF5",
            color: selected.length === 0 || loading ? "#6B6A7E" : "#FFFFFF",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            fontWeight: 500,
            border: "none",
            cursor:
              selected.length === 0 || loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
