import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MicroManus · Deep Research Agent",
  description: "A deep-research AI agent with usage-based billing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
