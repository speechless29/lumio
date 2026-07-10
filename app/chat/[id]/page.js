"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [messages, setMessages] = useState([]);
  const [entry, setEntry] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [entryCollapsed, setEntryCollapsed] = useState(true);
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("lumio_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadChat = async () => {
      try {
        const [entryRes, threadRes] = await Promise.all([
          fetch(`/api/v1/entries/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/entries/${id}/thread`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (entryRes.ok) {
          const entryJson = await entryRes.json();
          setEntry(entryJson?.data ?? null);
        }

        if (threadRes.ok) {
          const threadJson = await threadRes.json();
          setMessages(threadJson?.data?.messages ?? []);
        }
      } catch (err) {
        console.error("Failed to load chat", err);
      }
    };

    if (id) {
      loadChat();
    }
  }, [id, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const optimisticUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setLoading(true);
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");
    scrollToBottom();

    try {
      const token = localStorage.getItem("lumio_token");
      const res = await fetch(`/api/v1/entries/${id}/thread/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const json = await res.json();

      if (res.ok && json?.success) {
        setMessages((prev) => {
          const withoutOptimistic = prev.filter(
            (message) => message.id !== optimisticUserMessage.id,
          );
          return [
            ...withoutOptimistic,
            json.data.user_message,
            json.data.assistant_message,
          ];
        });
      } else {
        setMessages((prev) =>
          prev.filter((message) => message.id !== optimisticUserMessage.id),
        );
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticUserMessage.id),
      );
    } finally {
      setSending(false);
      setLoading(false);
      scrollToBottom();
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const previewText = entry?.content
    ? entry.content.length > 60
      ? `${entry.content.slice(0, 60)}...`
      : entry.content
    : "No entry context available.";

  return (
    <div style={{ backgroundColor: "#0F0F14", minHeight: "100vh" }}>
      <style jsx>{`
        @keyframes blink {
          0%,
          80%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        .typing-dot {
          animation: blink 1.2s infinite ease-in-out;
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background-color: #6b6a7e;
          margin: 0 2px;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: "rgba(15,15,20,0.94)",
          borderBottom: "1px solid #2A2A3A",
          backdropFilter: "blur(12px)",
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/journal"
            style={{
              color: "#9B9AAF",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ← Back to entry
          </Link>

          <div style={{ color: "#6B6A7E", fontSize: 13 }}>
            {entry ? formatDate(entry.created_at) : "Loading..."}
          </div>
        </div>
      </nav>

      <main
        style={{
          paddingTop: 64,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0F0F14",
        }}
      >
        <div
          onClick={() => setEntryCollapsed((prev) => !prev)}
          style={{
            backgroundColor: "#16161F",
            borderBottom: "1px solid #2A2A3A",
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          {entryCollapsed ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, color: "#9B9AAF" }}>
                {previewText}
              </div>
              <div style={{ fontSize: 11, color: "#6B6A7E" }}>▼ Show entry</div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B6A7E",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Entry context
                </div>
                <div style={{ fontSize: 11, color: "#6B6A7E" }}>▲ Hide</div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#9B9AAF",
                  lineHeight: 1.7,
                  maxHeight: 200,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry?.content || "No entry content available."}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 0 140px",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              width: "100%",
              padding: "32px 24px 0",
            }}
          >
            {messages.map((message) => {
              if (message.role === "assistant") {
                return (
                  <div
                    key={message.id || message.created_at}
                    style={{
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B6A7E",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: 6,
                      }}
                    >
                      Lumio
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        color: "#F5F4F0",
                        lineHeight: 1.7,
                        borderLeft: "2px solid #7C6EF5",
                        paddingLeft: 16,
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id || message.created_at}
                  style={{
                    marginBottom: 24,
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B6A7E",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 6,
                      textAlign: "right",
                    }}
                  >
                    You
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      backgroundColor: "#1A1A24",
                      border: "1px solid #2A2A3A",
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 16px",
                      fontSize: 14,
                      color: "#F5F4F0",
                      maxWidth: "70%",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div style={{ marginBottom: 24, color: "#6B6A7E" }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15,15,20,0.95)",
            borderTop: "1px solid #2A2A3A",
            backdropFilter: "blur(12px)",
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Keep talking..."
              style={{
                flex: 1,
                backgroundColor: "#1A1A24",
                border: "1px solid #2A2A3A",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#F5F4F0",
                fontSize: 14,
                lineHeight: 1.5,
                resize: "none",
                outline: "none",
                minHeight: 44,
                maxHeight: 120,
              }}
            />

            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                backgroundColor: "#7C6EF5",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "12px 16px",
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 500,
                opacity: sending || !input.trim() ? 0.7 : 1,
              }}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
