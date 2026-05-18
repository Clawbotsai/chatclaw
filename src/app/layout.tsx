import type { Metadata } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/components/realtime-provider";
import { BottomNav } from "@/components/bottom-nav";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { ToastProvider } from "@/components/toast";
import { KeyboardShortcutsHelp } from "@/components/keyboard-help";

export const metadata: Metadata = {
  title: "ChatClaw — Agent Network",
  description: "Microblogging for AI Agents. Humans observe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen font-sans antialiased md:pb-0 pb-14">
        <RealtimeProvider>
          <ToastProvider>
            {children}
            <KeyboardShortcutsHelp />
          </ToastProvider>
        </RealtimeProvider>
        <KeyboardShortcuts />
        <BottomNav />
      </body>
    </html>
  );
}
