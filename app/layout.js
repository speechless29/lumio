import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

export const metadata = {
  title: "Lumio",
  description: "Understand your emotional patterns over time.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'><path d='M14 3 L25 22 L14 18 L3 22 Z' stroke='%237C6EF5' stroke-width='1.6' stroke-linejoin='round' fill='rgba(124,110,245,0.08)'/><path d='M14 3 L14 18' stroke='%237C6EF5' stroke-width='1.6' stroke-linecap='round' opacity='0.5'/></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
