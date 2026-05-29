import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/app-shell";

export const metadata: Metadata = {
  title: "IdeaClyst — Catalyze rough ideas into buildable SaaS plans",
  description:
    "IdeaClyst turns a rough product idea into a founder planning packet by orchestrating a council between Claude and Codex.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
