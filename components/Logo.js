// components/Logo.js
export default function Logo({ size = 28, showText = true, darkText = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <path
          d="M14 3 L25 22 L14 18 L3 22 Z"
          stroke="#7C6EF5"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="rgba(124,110,245,0.08)"
        />
        <path
          d="M14 3 L14 18"
          stroke="#7C6EF5"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M14 18 L25 22"
          stroke="#7C6EF5"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M14 18 L3 22"
          stroke="#7C6EF5"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      {showText && (
        <span
          style={{
            color: darkText ? "#0F0F14" : "#F5F4F0",
            fontSize: 19,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          Lumio
        </span>
      )}
    </div>
  );
}
