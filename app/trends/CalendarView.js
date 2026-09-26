"use client";

import { useEffect, useState } from "react";

const COLOR_HEX = {
  red: "#E05C5C",
  amber: "#E8A44A",
  green: "#4CAF82",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toMonthParam(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildGrid(year, month, dayMap) {
  // month is 1-12
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso, ...dayMap[iso] });
  }
  return cells;
}

export default function CalendarView() {
  const [cursor, setCursor] = useState(() => new Date());
  const [dayMap, setDayMap] = useState({});
  const [selectedIso, setSelectedIso] = useState(null);
  const [dayEntries, setDayEntries] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [dayError, setDayError] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("lumio_token");

    fetch(`/api/v1/trends/calendar?month=${toMonthParam(cursor)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(
            json.error?.message || `Request failed (${res.status})`,
          );
        }
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const map = {};
        (json.data.days || []).forEach((d) => {
          map[d.date] = {
            color: d.color,
            avgMood: d.avgMood,
            entryCount: d.entryCount,
          };
        });
        setDayMap(map);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load calendar data:", error);
        setCalendarError(error.message || "Unable to load calendar data.");
      });
    return () => {
      cancelled = true;
    };
  }, [cursor]);

  function selectDay(cell) {
    if (!cell) return;
    setSelectedIso(cell.iso);
    setDayEntries(null);
    setDayError("");

    setDayLoading(true);
    const token = localStorage.getItem("lumio_token");
    if (!token) {
      setDayLoading(false);
      setDayError("Your session has expired. Please log in again.");
      return;
    }

    fetch(`/api/v1/entries?date=${cell.iso}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(
            json.error?.message || `Request failed (${res.status})`,
          );
        }
        setDayEntries(json.data.entries || []);
      })
      .catch((error) => {
        console.error("Failed to load entries for calendar day:", error);
        setDayError(error.message || "Unable to load entries for this day.");
      })
      .finally(() => setDayLoading(false));
  }

  function changeMonth(delta) {
    setCursor(new Date(year, month - 1 + delta, 1));
    setSelectedIso(null);
    setDayEntries(null);
    setCalendarError("");
    setDayError("");
  }

  const cells = buildGrid(year, month, dayMap);
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          style={{
            background: "none",
            border: "1px solid #2A2A3A",
            borderRadius: 8,
            color: "#9B9AAF",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          &lsaquo;
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#F5F4F0" }}>
          {monthLabel}
        </span>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          style={{
            background: "none",
            border: "1px solid #2A2A3A",
            borderRadius: 8,
            color: "#9B9AAF",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          &rsaquo;
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            style={{ textAlign: "center", fontSize: 11, color: "#6B6A7E" }}
          >
            {w}
          </div>
        ))}
      </div>

      {calendarError && (
        <p role="alert" style={{ fontSize: 13, color: "#E05C5C" }}>
          {calendarError}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {cells.map((cell, i) => (
          <button
            key={i}
            disabled={!cell}
            onClick={() => selectDay(cell)}
            style={{
              aspectRatio: "1",
              borderRadius: 8,
              border:
                cell?.iso === selectedIso
                  ? "1px solid #7C6EF5"
                  : "1px solid #2A2A3A",
              backgroundColor: "#0F0F14",
              cursor: cell ? "pointer" : "default",
              position: "relative",
              padding: 4,
            }}
          >
            {cell && (
              <span style={{ fontSize: 11, color: "#9B9AAF" }}>{cell.day}</span>
            )}
            {cell?.color && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLOR_HEX[cell.color],
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          backgroundColor: "#0F0F14",
          border: "1px solid #2A2A3A",
          borderRadius: 10,
          padding: "12px 16px",
          minHeight: 56,
        }}
      >
        {!selectedIso && (
          <p style={{ fontSize: 13, color: "#6B6A7E", margin: 0 }}>
            Tap a day to see its entries
          </p>
        )}
        {selectedIso && dayLoading && (
          <p style={{ fontSize: 13, color: "#6B6A7E", margin: 0 }}>Loading…</p>
        )}
        {selectedIso && !dayLoading && dayError && (
          <p role="alert" style={{ fontSize: 13, color: "#E05C5C", margin: 0 }}>
            {dayError}
          </p>
        )}
        {selectedIso && !dayLoading && !dayError && dayEntries === null && (
          <p style={{ fontSize: 13, color: "#6B6A7E", margin: 0 }}>
            No entry on this day.
          </p>
        )}
        {selectedIso &&
          !dayLoading &&
          !dayError &&
          dayEntries?.length === 0 && (
            <p style={{ fontSize: 13, color: "#6B6A7E", margin: 0 }}>
              No entries on this day.
            </p>
          )}
        {selectedIso &&
          !dayLoading &&
          dayEntries?.map((entry) => (
            <div
              key={entry.id}
              style={{ padding: "8px 0", borderTop: "1px solid #2A2A3A" }}
            >
              <span
                style={{
                  fontSize: 12,
                  backgroundColor: "#1A1A24",
                  border: "1px solid #2A2A3A",
                  borderRadius: 999,
                  padding: "2px 10px",
                  color: "#9B9AAF",
                }}
              >
                {entry.mood_label}
              </span>
              <p
                style={{
                  fontSize: 14,
                  margin: "6px 0 0",
                  lineHeight: 1.5,
                  color: "#F5F4F0",
                }}
              >
                {entry.content}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
