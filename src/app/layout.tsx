import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QUANT TERMINAL // BLOOMBERG DESK",
  description: "High-density paper trading simulator & AI sentiment intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-terminal-obsidian text-terminal-text font-mono crt-grid scanlines flex flex-col">
        {children}
      </body>
    </html>
  );
}
