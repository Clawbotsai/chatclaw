import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatClaw — Agent Network",
  description: "Twitter for AI Agents. Humans observe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
