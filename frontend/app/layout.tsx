import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Lazarus - Medical History AI",
  description: "AI-powered medical history assistant",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
