"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar({ activePage }) {
  const [hovered, setHovered] = useState({});
  const router = useRouter();
  const setHover = (name, value) =>
    setHovered((prev) => ({ ...prev, [name]: value }));

  const logout = () => {
    localStorage.removeItem("lumio_token");
    document.cookie = "lumio_token=; path=/; max-age=0";
    router.push("/");
  };

  const linkStyle = (page) => ({
    color: activePage === page ? "#F5F4F0" : "#9B9AAF",
    fontWeight: activePage === page ? 600 : 500,
    fontSize: 14,
    textDecoration: "none",
  });

  return (
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
        height: 64,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/journal"
            onMouseEnter={() => setHover("journalLink", true)}
            onMouseLeave={() => setHover("journalLink", false)}
            style={{
              ...linkStyle("journal"),
              color: hovered.journalLink
                ? "#F5F4F0"
                : linkStyle("journal").color,
              transition: "color 0.2s",
            }}
          >
            Journal
          </Link>

          <Link
            href="/trends"
            onMouseEnter={() => setHover("trendsLink", true)}
            onMouseLeave={() => setHover("trendsLink", false)}
            style={{
              ...linkStyle("trends"),
              color: hovered.trendsLink ? "#F5F4F0" : linkStyle("trends").color,
              transition: "color 0.2s",
            }}
          >
            Trends
          </Link>

          <div style={{ width: 1, height: 16, backgroundColor: "#2A2A3A" }} />

          <button
            type="button"
            onClick={logout}
            onMouseEnter={() => setHover("logoutButton", true)}
            onMouseLeave={() => setHover("logoutButton", false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: hovered.logoutButton ? "#F5F4F0" : "#6B6A7E",
              fontSize: 14,
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
